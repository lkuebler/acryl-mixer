import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Reusable photo color picker with pinch-to-zoom and drag-to-pan.
 * Props:
 *   onColorPicked({ hex, r, g, b }) — called whenever user clicks/taps a spot
 *   pickedHex — the currently picked hex (optional, for showing the preview externally)
 */
export default function PhotoColorPicker({ onColorPicked, pickedHex }) {
    const [imgSrc, setImgSrc] = useState(null)
    const [crosshair, setCrosshair] = useState(null)
    // Zoom / pan state
    const [scale, setScale] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const canvasRef = useRef(null)
    const imgRef = useRef(null)
    const fileRef = useRef(null)
    const wrapperRef = useRef(null)
    // Pointer tracking for pan
    const pointers = useRef([])
    const lastPinchDist = useRef(null)
    const panStart = useRef(null)
    const panStartOffset = useRef(null)
    const isPinching = useRef(false)

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) return
        const url = URL.createObjectURL(file)
        setImgSrc(url)
        setCrosshair(null)
        setScale(1)
        setOffset({ x: 0, y: 0 })
    }

    function handleDrop(e) {
        e.preventDefault()
        handleFile(e.dataTransfer.files?.[0])
    }

    // ── Color picking ─────────────────────────────────────────────────────────
    const pickColor = useCallback((clientX, clientY) => {
        const img = imgRef.current
        const canvas = canvasRef.current
        const wrapper = wrapperRef.current
        if (!img || !canvas || !wrapper) return

        const wRect = wrapper.getBoundingClientRect()
        // Convert client coords to image coords accounting for zoom/pan
        const localX = (clientX - wRect.left - offset.x) / scale
        const localY = (clientY - wRect.top - offset.y) / scale

        // Convert to image-space
        const iRect = { width: img.naturalWidth, height: img.naturalHeight }
        const imgDisplayWidth = img.width
        const imgDisplayHeight = img.height
        const scaleX = iRect.width / imgDisplayWidth
        const scaleY = iRect.height / imgDisplayHeight
        const px = Math.round(localX * scaleX)
        const py = Math.round(localY * scaleY)

        canvas.width = iRect.width
        canvas.height = iRect.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)

        const sx = Math.max(0, Math.min(px - 2, iRect.width - 5))
        const sy = Math.max(0, Math.min(py - 2, iRect.height - 5))
        const sample = ctx.getImageData(sx, sy, 5, 5)
        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < sample.data.length; i += 4) {
            r += sample.data[i]; g += sample.data[i + 1]; b += sample.data[i + 2]; count++
        }
        r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count)
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')

        // Crosshair at wrapper-relative position
        setCrosshair({ x: clientX - wRect.left, y: clientY - wRect.top })
        onColorPicked({ hex, r, g, b })
    }, [onColorPicked, scale, offset])

    // ── Pointer events for zoom + pan ─────────────────────────────────────────
    function onPointerDown(e) {
        pointers.current.push({ id: e.pointerId, x: e.clientX, y: e.clientY })
        if (pointers.current.length === 1) {
            // Potential pan start
            panStart.current = { x: e.clientX, y: e.clientY }
            panStartOffset.current = { ...offset }
            isPinching.current = false
        } else if (pointers.current.length === 2) {
            isPinching.current = true
            lastPinchDist.current = getPinchDist()
        }
    }

    function getPinchDist() {
        if (pointers.current.length < 2) return 0
        const [a, b] = pointers.current
        return Math.hypot(a.x - b.x, a.y - b.y)
    }

    function onPointerMove(e) {
        const idx = pointers.current.findIndex(p => p.id === e.pointerId)
        if (idx !== -1) {
            pointers.current[idx] = { id: e.pointerId, x: e.clientX, y: e.clientY }
        }

        if (pointers.current.length === 2) {
            // Pinch zoom
            isPinching.current = true
            const dist = getPinchDist()
            if (lastPinchDist.current) {
                const delta = dist / lastPinchDist.current
                setScale(prev => Math.max(0.5, Math.min(8, prev * delta)))
            }
            lastPinchDist.current = dist
        } else if (pointers.current.length === 1 && !isPinching.current && panStart.current) {
            // Pan
            const dx = e.clientX - panStart.current.x
            const dy = e.clientY - panStart.current.y
            setOffset({ x: panStartOffset.current.x + dx, y: panStartOffset.current.y + dy })
        }
    }

    function onPointerUp(e) {
        const wasSingleTap = pointers.current.length === 1 && !isPinching.current
        const dx = panStart.current ? Math.abs(e.clientX - panStart.current.x) : 999
        const dy = panStart.current ? Math.abs(e.clientY - panStart.current.y) : 999
        pointers.current = pointers.current.filter(p => p.id !== e.pointerId)
        if (pointers.current.length === 0) { isPinching.current = false; lastPinchDist.current = null }
        // Only pick color if it was a tap (little movement)
        if (wasSingleTap && dx < 8 && dy < 8) {
            pickColor(e.clientX, e.clientY)
        }
    }

    // Mouse wheel zoom
    function onWheel(e) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        setScale(prev => Math.max(0.5, Math.min(8, prev * delta)))
    }

    useEffect(() => {
        const el = wrapperRef.current
        if (!el) return
        el.addEventListener('wheel', onWheel, { passive: false })
        return () => el.removeEventListener('wheel', onWheel)
    }, [])

    return (
        <div>
            {!imgSrc ? (
                <label
                    className="photo-drop-zone"
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                >
                    <div className="photo-drop-icon">🖼️</div>
                    <div className="photo-drop-label">Upload photo</div>
                    <div className="photo-drop-sub">Tap or drag an image — then tap any spot to pick its color. Pinch or scroll to zoom.</div>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => handleFile(e.target.files?.[0])}
                    />
                </label>
            ) : (
                <div>
                    {/* Zoom/pan container */}
                    <div
                        ref={wrapperRef}
                        className="photo-picker-wrapper"
                        style={{ overflow: 'hidden', position: 'relative', cursor: 'crosshair', touchAction: 'none' }}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerLeave={onPointerUp}
                    >
                        <div style={{
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                            transformOrigin: '0 0',
                            transition: 'none',
                            willChange: 'transform',
                        }}>
                            <img
                                ref={imgRef}
                                src={imgSrc}
                                alt="Pick color"
                                className="photo-picker-img"
                                draggable={false}
                                loading="lazy"
                                decoding="async"
                                style={{ display: 'block', width: '100%', pointerEvents: 'none', userSelect: 'none' }}
                            />
                        </div>
                        {/* Crosshair dot — positioned relative to wrapper (not image transform) */}
                        {crosshair && (
                            <div
                                className="photo-crosshair"
                                style={{ left: crosshair.x, top: crosshair.y, transform: 'translate(-50%,-50%)' }}
                            >
                                {pickedHex && (
                                    <div className="photo-crosshair-dot" style={{ background: pickedHex }} />
                                )}
                            </div>
                        )}
                        {/* Zoom indicator */}
                        {scale !== 1 && (
                            <div style={{
                                position: 'absolute', bottom: 8, right: 8,
                                background: 'rgba(0,0,0,0.6)', color: '#fff',
                                borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600,
                            }}>
                                {scale.toFixed(1)}×
                            </div>
                        )}
                    </div>

                    {pickedHex && (
                        <div className="flex items-center gap-3" style={{ marginTop: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: pickedHex, border: '2px solid var(--border)', flexShrink: 0 }} />
                            <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-muted)' }}>{pickedHex}</span>
                            <button
                                className="btn btn-ghost"
                                style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: 12 }}
                                onClick={() => { setImgSrc(null); setCrosshair(null); setScale(1); setOffset({ x: 0, y: 0 }) }}
                            >
                                Change photo
                            </button>
                        </div>
                    )}

                    {!pickedHex && (
                        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 8, textAlign: 'center' }}>
                            Tap any spot · scroll or pinch to zoom · drag to pan
                        </div>
                    )}
                </div>
            )}
            {/* Hidden canvas for pixel sampling */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    )
}

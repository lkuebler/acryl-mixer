import { useState, useRef, useCallback } from 'react'

/**
 * Reusable photo color picker.
 * Shows an upload dropzone → displays the photo → lets user tap any spot to pick that pixel color.
 * Props:
 *   onColorPicked({ hex, r, g, b }) — called whenever user clicks/taps a spot
 *   pickedHex — the currently picked hex (optional, for showing the preview externally)
 */
export default function PhotoColorPicker({ onColorPicked, pickedHex }) {
    const [imgSrc, setImgSrc] = useState(null)
    const [crosshair, setCrosshair] = useState(null) // { x%, y% }
    const canvasRef = useRef(null)
    const imgRef = useRef(null)
    const fileRef = useRef(null)

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) return
        const url = URL.createObjectURL(file)
        setImgSrc(url)
        setCrosshair(null)
    }

    function handleDrop(e) {
        e.preventDefault()
        handleFile(e.dataTransfer.files?.[0])
    }

    const pickColor = useCallback((e) => {
        const img = imgRef.current
        const canvas = canvasRef.current
        if (!img || !canvas) return

        const rect = img.getBoundingClientRect()
        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY
        const relX = clientX - rect.left
        const relY = clientY - rect.top

        // Scale to natural image size
        const scaleX = img.naturalWidth / rect.width
        const scaleY = img.naturalHeight / rect.height
        const px = Math.floor(relX * scaleX)
        const py = Math.floor(relY * scaleY)

        // Draw image to canvas for pixel extraction
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)

        const sample = ctx.getImageData(Math.max(0, px - 2), Math.max(0, py - 2), 5, 5)
        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < sample.data.length; i += 4) {
            r += sample.data[i]; g += sample.data[i + 1]; b += sample.data[i + 2]; count++
        }
        r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count)
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')

        // Update crosshair position as %
        setCrosshair({ x: (relX / rect.width) * 100, y: (relY / rect.height) * 100 })
        onColorPicked({ hex, r, g, b })
    }, [onColorPicked])

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
                    <div className="photo-drop-sub">Tap or drag an image — then click any spot to pick its color</div>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => handleFile(e.target.files?.[0])}
                    />
                </label>
            ) : (
                <div style={{ position: 'relative' }}>
                    <div className="photo-picker-wrapper">
                        <img
                            ref={imgRef}
                            src={imgSrc}
                            alt="Pick color"
                            className="photo-picker-img"
                            onClick={pickColor}
                            onTouchStart={e => { e.preventDefault(); pickColor(e) }}
                            draggable={false}
                        />
                        {crosshair && (
                            <div
                                className="photo-crosshair"
                                style={{ left: `${crosshair.x}%`, top: `${crosshair.y}%` }}
                            >
                                {pickedHex && (
                                    <div className="photo-crosshair-dot" style={{ background: pickedHex }} />
                                )}
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
                                onClick={() => { setImgSrc(null); setCrosshair(null) }}
                            >
                                Change photo
                            </button>
                        </div>
                    )}

                    {!pickedHex && (
                        <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 8, textAlign: 'center' }}>
                            Tap any spot on the photo to pick its color
                        </p>
                    )}
                </div>
            )}
            {/* Hidden canvas for pixel sampling */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    )
}

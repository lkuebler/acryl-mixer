import { useState, useEffect, useRef } from 'react'
import { getAllPaints, getAllPalettes } from '../db/db.js'
import { getMixingGuide } from '../utils/colorMix.js'
import { contrastColor } from '../utils/colorHarmony.js'
import { useToast } from '../components/Toast.jsx'
import PhotoColorPicker from '../components/PhotoColorPicker.jsx'

// ─── Shared mix result card ───────────────────────────────────────────────────
function MixResultCard({ guide }) {
    if (!guide) return null
    const acc = guide.accuracy
    const accColor = acc >= 80 ? '#4ade80' : acc >= 50 ? '#facc15' : '#f87c6a'

    return (
        <div style={{
            background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card2) 100%)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: 16,
            marginBottom: 4
        }}>
            {/* Header swatches + accuracy */}
            <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Target → Result</div>
                    <div className="flex items-center gap-2">
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: guide.target, border: '2px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }} />
                        <div style={{ fontSize: 18, color: 'var(--text-faint)' }}>→</div>
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: guide.resultHex, border: '2px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }} />
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', border: `3px solid ${accColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: accColor }}>
                        {acc}%
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Match</div>
                </div>
            </div>

            {/* Ratio bar */}
            <div style={{ height: 6, borderRadius: 999, overflow: 'hidden', display: 'flex', marginBottom: 12, background: 'var(--bg-card2)' }}>
                {guide.steps.map((s, i) => (
                    <div key={i} style={{ width: `${s.ratio}%`, background: s.paint.hex, transition: 'width 0.4s ease' }} title={`${s.paint.name} ${s.ratio}%`} />
                ))}
            </div>

            {/* Paint steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[...guide.steps].sort((a, b) => b.ratio - a.ratio).map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border)' }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: '#fff' }}>
                            {i + 1}
                        </div>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: step.paint.hex, border: '1px solid var(--border)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{step.paint.name}</div>
                            {step.paint.brand && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{step.paint.brand}</div>}
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, var(--accent), #9b8cf7)', color: '#fff', borderRadius: 8, padding: '3px 10px', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                            {step.ratio}%
                        </div>
                    </div>
                ))}
            </div>

            {acc < 60 && (
                <div style={{ marginTop: 10, padding: '9px 12px', background: 'rgba(248,124,106,0.08)', border: '1px solid rgba(248,124,106,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--accent2)', fontWeight: 500 }}>
                    ⚠ Low match — add more paints to your library for better results.
                </div>
            )}
        </div>
    )
}

// ── Camera hook ───────────────────────────────────────────────────────────────
function useCameraColor() {
    const [cameraActive, setCameraActive] = useState(false)
    const [liveColor, setLiveColor] = useState(null)
    const [capturedColor, setCapturedColor] = useState(null)
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const intervalRef = useRef(null)
    const toast = useToast()

    useEffect(() => {
        if (!cameraActive) return
        intervalRef.current = setInterval(() => {
            const v = videoRef.current, c = canvasRef.current
            if (!v || !c || v.readyState < 2 || v.videoWidth === 0) return
            c.width = v.videoWidth; c.height = v.videoHeight
            const ctx = c.getContext('2d')
            ctx.drawImage(v, 0, 0)
            const d = ctx.getImageData(Math.floor(v.videoWidth / 2), Math.floor(v.videoHeight / 2), 1, 1).data
            setLiveColor('#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join(''))
        }, 150)
        return () => clearInterval(intervalRef.current)
    }, [cameraActive])

    async function start() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            streamRef.current = stream
            if (videoRef.current) videoRef.current.srcObject = stream
            setCameraActive(true)
        } catch { toast('Camera not available') }
    }

    function stop() {
        clearInterval(intervalRef.current)
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        setCameraActive(false); setLiveColor(null)
    }

    function capture() {
        if (!liveColor) return
        setCapturedColor(liveColor)
        stop()
    }

    function reset() { setCapturedColor(null) }

    useEffect(() => () => stop(), []) // eslint-disable-line

    return { videoRef, canvasRef, cameraActive, liveColor, capturedColor, start, stop, capture, reset }
}

// ── Camera UI component ───────────────────────────────────────────────────────
function CameraPickerUI({ camera, onCapture, captureLabel = '📸 Capture Color' }) {
    if (camera.capturedColor) {
        return (
            <div>
                <div style={{ height: 100, borderRadius: 'var(--radius)', background: camera.capturedColor, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: contrastColor(camera.capturedColor) }}>
                    {camera.capturedColor.toUpperCase()}
                </div>
                <button className="btn btn-ghost w-full" onClick={() => { camera.reset(); camera.start() }}>🔄 Retake</button>
            </div>
        )
    }
    return (
        <>
            <div className="camera-wrapper">
                <video ref={camera.videoRef} autoPlay playsInline muted style={{ width: '100%' }} />
                <div className="camera-crosshair" />
                {camera.liveColor && (
                    <div style={{ position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: '50%', background: camera.liveColor, border: '3px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 16px rgba(0,0,0,0.6)' }} />
                )}
            </div>
            <canvas ref={camera.canvasRef} style={{ display: 'none' }} />
            <button className="btn btn-primary w-full mt-3" onClick={() => { camera.capture(); onCapture && onCapture(camera.liveColor) }} disabled={!camera.liveColor}>{captureLabel}</button>
        </>
    )
}

// ─── Single Color tab ─────────────────────────────────────────────────────────
function SingleColorTab({ paints, toast }) {
    const [inputMode, setInputMode] = useState('picker') // 'picker' | 'camera' | 'photo'
    const [targetHex, setTargetHex] = useState('#e87c4a')
    const [pickedFromPhoto, setPickedFromPhoto] = useState(null)
    const [guide, setGuide] = useState(null)
    const [loading, setLoading] = useState(false)
    // Fix My Mix
    const [showFix, setShowFix] = useState(false)
    const [currentMixMode, setCurrentMixMode] = useState('photo') // 'photo' | 'camera'
    const [currentMixHex, setCurrentMixHex] = useState(null)
    const [fixGuide, setFixGuide] = useState(null)
    const camera = useCameraColor()
    const fixCamera = useCameraColor()

    const activeHex = inputMode === 'photo' && pickedFromPhoto ? pickedFromPhoto :
        inputMode === 'camera' && camera.capturedColor ? camera.capturedColor : targetHex

    function switchInputMode(m) {
        if (m !== 'camera') camera.stop()
        if (m === 'camera') camera.start()
        setInputMode(m)
    }

    function compute() {
        if (paints.length === 0) { toast('Add paints to your library first'); return }
        setLoading(true)
        setTimeout(() => {
            try { setGuide(getMixingGuide(activeHex, paints)) }
            catch { toast('Could not compute mixing guide') }
            setLoading(false)
        }, 80)
    }

    function computeFix() {
        if (!currentMixHex) { toast('Pick your current color first'); return }
        // Compute delta: what % of what to add to go from currentMixHex → activeHex
        // We get recipe for target minus recipe for current (simplified)
        const targetGuide = getMixingGuide(activeHex, paints)
        const currentGuide = getMixingGuide(currentMixHex, paints)
        // Build delta steps: extra ratios needed
        const allPaints = new Map()
        targetGuide.steps.forEach(s => allPaints.set(s.paint.name, { paint: s.paint, target: s.ratio, current: 0 }))
        currentGuide.steps.forEach(s => {
            if (!allPaints.has(s.paint.name)) allPaints.set(s.paint.name, { paint: s.paint, target: 0, current: s.ratio })
            else allPaints.get(s.paint.name).current = s.ratio
        })
        const deltas = []
        allPaints.forEach(({ paint, target, current }) => {
            const diff = target - current
            if (diff > 2) deltas.push({ paint, delta: Math.round(diff) })
        })
        setFixGuide({ current: currentMixHex, target: activeHex, deltas })
    }

    return (
        <>
            {/* Input mode toggle */}
            <div className="color-input-mode-row">
                <button className={`color-mode-btn ${inputMode === 'picker' ? 'active' : ''}`} onClick={() => switchInputMode('picker')}>
                    🎨 Color Picker
                </button>
                <button className={`color-mode-btn ${inputMode === 'camera' ? 'active' : ''}`} onClick={() => switchInputMode('camera')}>
                    📷 Camera
                </button>
                <button className={`color-mode-btn ${inputMode === 'photo' ? 'active' : ''}`} onClick={() => switchInputMode('photo')}>
                    🖼️ From Photo
                </button>
            </div>

            {/* Picker input */}
            {inputMode === 'picker' && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 12 }}>
                    <div className="flex items-center gap-3" style={{ marginBottom: 10 }}>
                        <input type="color" value={targetHex} onChange={e => setTargetHex(e.target.value)} id="target-color-picker" />
                        <input className="input" value={targetHex} onChange={e => setTargetHex(e.target.value)} style={{ fontFamily: 'monospace', flex: 1 }} id="target-hex-input" />
                    </div>
                    <div style={{ height: 52, borderRadius: 10, background: targetHex, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: contrastColor(targetHex) }}>
                        {targetHex.toUpperCase()}
                    </div>
                </div>
            )}

            {/* Camera picker */}
            {inputMode === 'camera' && (
                <div style={{ marginBottom: 12 }}>
                    <CameraPickerUI camera={camera} />
                </div>
            )}

            {/* Photo picker */}
            {inputMode === 'photo' && (
                <div style={{ marginBottom: 12 }}>
                    <PhotoColorPicker
                        pickedHex={pickedFromPhoto}
                        onColorPicked={({ hex }) => setPickedFromPhoto(hex)}
                    />
                    {pickedFromPhoto && (
                        <div style={{ marginTop: 10, height: 48, borderRadius: 10, background: pickedFromPhoto, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: contrastColor(pickedFromPhoto) }}>
                            {pickedFromPhoto.toUpperCase()}
                        </div>
                    )}
                </div>
            )}

            <button
                className="btn btn-primary w-full"
                style={{ marginBottom: guide ? 16 : 0 }}
                onClick={compute}
                disabled={loading || (inputMode === 'photo' && !pickedFromPhoto) || (inputMode === 'camera' && !camera.capturedColor)}
                id="compute-mix-btn"
            >
                {loading ? '⏳ Computing…' : '🧪 Compute Mix'}
            </button>

            {guide && <MixResultCard guide={guide} />}

            {/* Fix My Mix */}
            {guide && (
                <div style={{ marginTop: 16 }}>
                    <button
                        className="btn btn-ghost w-full"
                        onClick={() => setShowFix(!showFix)}
                        style={{ marginBottom: showFix ? 12 : 0 }}
                    >
                        {showFix ? '▲' : '▼'} 🎨 Fix My Mix — correct current color toward target
                    </button>

                    {showFix && (
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                                Take a photo or use the camera to pick your <strong>current mixed color</strong>. The app will suggest what additional paints to add to move it toward the target.
                            </div>

                            <div className="tab-pills" style={{ marginBottom: 12 }}>
                                <button className={`tab-pill ${currentMixMode === 'photo' ? 'active' : ''}`} onClick={() => { setCurrentMixMode('photo'); fixCamera.stop() }}>🖼️ Photo</button>
                                <button className={`tab-pill ${currentMixMode === 'camera' ? 'active' : ''}`} onClick={() => { setCurrentMixMode('camera'); fixCamera.start() }}>📷 Camera</button>
                            </div>

                            {currentMixMode === 'photo' && (
                                <PhotoColorPicker
                                    pickedHex={currentMixHex}
                                    onColorPicked={({ hex }) => setCurrentMixHex(hex)}
                                />
                            )}
                            {currentMixMode === 'camera' && (
                                <CameraPickerUI camera={fixCamera} onCapture={hex => setCurrentMixHex(hex)} captureLabel="📸 This Is My Current Color" />
                            )}

                            {currentMixHex && (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 12 }}>
                                        <div style={{ flex: 1, textAlign: 'center' }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 4 }}>Current</div>
                                            <div style={{ height: 40, borderRadius: 8, background: currentMixHex, border: '1px solid var(--border)' }} />
                                        </div>
                                        <div style={{ fontSize: 20 }}>→</div>
                                        <div style={{ flex: 1, textAlign: 'center' }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 4 }}>Target</div>
                                            <div style={{ height: 40, borderRadius: 8, background: activeHex, border: '1px solid var(--border)' }} />
                                        </div>
                                    </div>
                                    <button className="btn btn-primary w-full" onClick={computeFix}>🔬 Get Adjustment Suggestions</button>
                                </>
                            )}

                            {fixGuide && (
                                <div style={{ marginTop: 14 }}>
                                    {fixGuide.deltas.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 12 }}>
                                            ✓ Your current mix is already very close to the target!
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Add these pigments:</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {fixGuide.deltas.sort((a, b) => b.delta - a.delta).map((d, i) => (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                                        <div style={{ width: 24, height: 24, borderRadius: 6, background: d.paint.hex, border: '1px solid var(--border)', flexShrink: 0 }} />
                                                        <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{d.paint.name}</div>
                                                        <div style={{ background: 'linear-gradient(135deg, var(--accent), #9b8cf7)', color: '#fff', borderRadius: 8, padding: '3px 10px', fontSize: 13, fontWeight: 800 }}>+{d.delta}%</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    )
}

// ─── Mix Palette tab ──────────────────────────────────────────────────────────
function MixPaletteTab({ paints, toast }) {
    const [palettes, setPalettes] = useState([])
    const [selectedId, setSelectedId] = useState('')
    const [results, setResults] = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        getAllPalettes().then(data => {
            const sorted = data.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
            setPalettes(sorted)
            if (sorted.length > 0) setSelectedId(sorted[0].id)
        })
    }, [])

    const selectedPalette = palettes.find(p => p.id === selectedId)

    function mixAll() {
        if (paints.length === 0) { toast('Add paints to your library first'); return }
        if (!selectedPalette) { toast('Select a palette first'); return }
        setLoading(true)
        setTimeout(() => {
            setResults({
                name: selectedPalette.name,
                items: selectedPalette.colors.map(hex => ({ hex, guide: getMixingGuide(hex, paints) }))
            })
            setLoading(false)
        }, 80)
    }

    if (palettes.length === 0) {
        return (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, padding: '40px 20px', background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>✨</div>
                No saved palettes yet.<br />
                <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Generate and save one in the Palettes tab.</span>
            </div>
        )
    }

    return (
        <>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 12 }}>
                <select className="select" value={selectedId} onChange={e => { setSelectedId(e.target.value); setResults(null) }} id="palette-select" style={{ marginBottom: 10 }}>
                    {palettes.map(p => <option key={p.id} value={p.id}>{p.name} ({p.colors.length} colors)</option>)}
                </select>
                {selectedPalette && (
                    <div style={{ height: 32, borderRadius: 8, overflow: 'hidden', display: 'flex' }}>
                        {selectedPalette.colors.map((hex, i) => <div key={i} style={{ background: hex, flex: 1 }} title={hex} />)}
                    </div>
                )}
            </div>

            <button className="btn btn-primary w-full" style={{ marginBottom: results ? 20 : 0 }} onClick={mixAll} disabled={loading} id="mix-palette-btn">
                {loading ? '⏳ Computing…' : '🎨 Mix Palette'}
            </button>

            {results && (
                <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                        {results.name}
                    </div>
                    {results.items.map(({ hex, guide }, i) => (
                        <div key={i} style={{ marginBottom: 20 }}>
                            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                                <div style={{ width: 18, height: 18, borderRadius: 4, background: hex, border: '1px solid var(--border)', flexShrink: 0 }} />
                                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-faint)' }}>{hex}</span>
                            </div>
                            <MixResultCard guide={guide} />
                        </div>
                    ))}
                </>
            )}
        </>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MixGuide() {
    const [mode, setMode] = useState('single') // 'single' | 'palette'
    const [paints, setPaints] = useState([])
    const toast = useToast()

    useEffect(() => { getAllPaints().then(setPaints) }, [])

    return (
        <div className="page">
            <div className="page-header">
                <h1>🧪 Mix Guide</h1>
                <p>Compute mixing recipes from your paint library</p>
            </div>

            {/* Mode segment control */}
            <div className="segment-control">
                <button className={`segment-btn ${mode === 'single' ? 'active' : ''}`} onClick={() => setMode('single')}>Single Color</button>
                <button className={`segment-btn ${mode === 'palette' ? 'active' : ''}`} onClick={() => setMode('palette')}>Mix Palette</button>
            </div>

            {paints.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🎨</div>
                    <h3>Library is empty</h3>
                    <p>Add acrylic paints to your library first, then come back here to get mixing advice.</p>
                </div>
            ) : mode === 'single' ? (
                <SingleColorTab paints={paints} toast={toast} />
            ) : (
                <MixPaletteTab paints={paints} toast={toast} />
            )}
        </div>
    )
}

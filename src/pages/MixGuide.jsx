import { useState, useEffect, useRef } from 'react'
import { getAllPaints, getAllPalettes } from '../db/db.js'
import { getMixingGuide } from '../utils/colorMix.js'
import { contrastColor } from '../utils/colorHarmony.js'
import { useToast } from '../components/Toast.jsx'
import PhotoColorPicker from '../components/PhotoColorPicker.jsx'

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
            const ctx = c.getContext('2d'); ctx.drawImage(v, 0, 0)
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
        streamRef.current = null; setCameraActive(false); setLiveColor(null)
    }
    function capture() { setCapturedColor(liveColor); stop() }
    function reset() { setCapturedColor(null) }
    useEffect(() => () => stop(), []) // eslint-disable-line

    return { videoRef, canvasRef, cameraActive, liveColor, capturedColor, start, stop, capture, reset }
}

// ── Camera UI ──────────────────────────────────────────────────────────────────
function CameraPickerUI({ camera, onCapture, captureLabel = '📸 Capture Color' }) {
    if (camera.capturedColor) {
        return (
            <div>
                <div style={{ height: 80, borderRadius: 10, background: camera.capturedColor, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: contrastColor(camera.capturedColor) }}>
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
                {camera.liveColor && <div style={{ position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: '50%', background: camera.liveColor, border: '3px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 16px rgba(0,0,0,0.6)' }} />}
            </div>
            <canvas ref={camera.canvasRef} style={{ display: 'none' }} />
            <button className="btn btn-primary w-full mt-3" onClick={() => { camera.capture(); onCapture?.(camera.liveColor) }} disabled={!camera.liveColor}>{captureLabel}</button>
        </>
    )
}

// ── Mix Result Card ───────────────────────────────────────────────────────────
function MixResultCard({ guide }) {
    if (!guide) return null
    const acc = guide.accuracy
    const accColor = acc >= 80 ? '#4ade80' : acc >= 50 ? '#facc15' : '#f87c6a'
    return (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14 }}>
            <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2">
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: guide.target, border: '2px solid var(--border)' }} />
                        <div style={{ fontSize: 16, color: 'var(--text-faint)' }}>→</div>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: guide.resultHex, border: '2px solid var(--border)' }} />
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', border: `3px solid ${accColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: accColor }}>
                        {acc}%
                    </div>
                </div>
            </div>
            <div style={{ height: 5, borderRadius: 999, overflow: 'hidden', display: 'flex', marginBottom: 10 }}>
                {guide.steps.map((s, i) => <div key={i} style={{ width: `${s.ratio}%`, background: s.paint.hex }} />)}
            </div>
            {[...guide.steps].sort((a, b) => b.ratio - a.ratio).map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: step.paint.hex, border: '1px solid var(--border)', flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{step.paint.name}</div>
                    <div style={{ background: 'linear-gradient(135deg, var(--accent), #9b8cf7)', color: '#fff', borderRadius: 7, padding: '2px 9px', fontSize: 13, fontWeight: 800 }}>{step.ratio}%</div>
                </div>
            ))}
        </div>
    )
}

// ── Fix My Mix Panel (reusable dropdown) ─────────────────────────────────────
function FixMyMixPanel({ targetHex, paints }) {
    const [mode, setMode] = useState('photo')
    const [currentHex, setCurrentHex] = useState(null)
    const [result, setResult] = useState(null)
    const camera = useCameraColor()
    const toast = useToast()

    function computeFix() {
        if (!currentHex && !camera.capturedColor) { toast('Pick your current color first'); return }
        const actual = currentHex || camera.capturedColor
        const targetGuide = getMixingGuide(targetHex, paints)
        const currentGuide = getMixingGuide(actual, paints)
        const allPaints = new Map()
        targetGuide.steps.forEach(s => allPaints.set(s.paint.name, { paint: s.paint, target: s.ratio, current: 0 }))
        currentGuide.steps.forEach(s => {
            if (!allPaints.has(s.paint.name)) allPaints.set(s.paint.name, { paint: s.paint, target: 0, current: s.ratio })
            else allPaints.get(s.paint.name).current = s.ratio
        })
        const deltas = []
        allPaints.forEach(({ paint, target, current }) => { if (target - current > 2) deltas.push({ paint, delta: Math.round(target - current) }) })
        setResult({ deltas, from: currentHex || camera.capturedColor })
    }

    return (
        <div style={{ marginTop: 10, padding: 14, background: 'rgba(124,106,247,0.06)', borderRadius: 12, border: '1px solid rgba(124,106,247,0.15)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text-muted)', marginBottom: 8 }}>🔬 Fix My Mix</div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 10 }}>Pick your current mixed color — get suggestions on what to add.</div>
            <div className="tab-pills" style={{ marginBottom: 10 }}>
                <button className={`tab-pill ${mode === 'photo' ? 'active' : ''}`} onClick={() => { setMode('photo'); camera.stop() }}>🖼️ Photo</button>
                <button className={`tab-pill ${mode === 'camera' ? 'active' : ''}`} onClick={() => { setMode('camera'); camera.start() }}>📷 Camera</button>
            </div>
            {mode === 'photo' && <PhotoColorPicker pickedHex={currentHex} onColorPicked={({ hex }) => setCurrentHex(hex)} />}
            {mode === 'camera' && <CameraPickerUI camera={camera} onCapture={hex => setCurrentHex(hex)} captureLabel="📸 This Is My Current Color" />}

            {(currentHex || camera.capturedColor) && (
                <>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, marginBottom: 10 }}>
                        {[{ label: 'Current', hex: currentHex || camera.capturedColor }, { label: 'Target', hex: targetHex }].map((s, i) => (
                            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 4 }}>{s.label}</div>
                                <div style={{ height: 32, borderRadius: 6, background: s.hex, border: '1px solid var(--border)' }} />
                            </div>
                        ))}
                    </div>
                    <button className="btn btn-primary w-full" onClick={computeFix}>Get Adjustments</button>
                </>
            )}

            {result && (
                <div style={{ marginTop: 10 }}>
                    {result.deltas.length === 0 ? (
                        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: 6 }}>✓ Already very close to the target!</div>
                    ) : (
                        result.deltas.sort((a, b) => b.delta - a.delta).map((d, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 5, border: '1px solid var(--border)' }}>
                                <div style={{ width: 18, height: 18, borderRadius: 4, background: d.paint.hex, border: '1px solid var(--border)', flexShrink: 0 }} />
                                <div style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{d.paint.name}</div>
                                <div style={{ background: 'linear-gradient(135deg, var(--accent), #9b8cf7)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 800 }}>+{d.delta}%</div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Single Color tab ─────────────────────────────────────────────────────────
function SingleColorTab({ paints }) {
    const [inputMode, setInputMode] = useState('picker')
    const [targetHex, setTargetHex] = useState('#e87c4a')
    const [pickedFromPhoto, setPickedFromPhoto] = useState(null)
    const [guide, setGuide] = useState(null)
    const [loading, setLoading] = useState(false)
    const [showFix, setShowFix] = useState(false)
    const camera = useCameraColor()
    const toast = useToast()

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

    return (
        <>
            <div className="color-input-mode-row">
                <button className={`color-mode-btn ${inputMode === 'picker' ? 'active' : ''}`} onClick={() => switchInputMode('picker')}>🎨 Color Picker</button>
                <button className={`color-mode-btn ${inputMode === 'camera' ? 'active' : ''}`} onClick={() => switchInputMode('camera')}>📷 Camera</button>
                <button className={`color-mode-btn ${inputMode === 'photo' ? 'active' : ''}`} onClick={() => switchInputMode('photo')}>🖼️ Photo</button>
            </div>

            {inputMode === 'picker' && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 12 }}>
                    <div className="flex items-center gap-3" style={{ marginBottom: 10 }}>
                        <input type="color" value={targetHex} onChange={e => setTargetHex(e.target.value)} id="target-color-picker" />
                        <input className="input" value={targetHex} onChange={e => setTargetHex(e.target.value)} style={{ fontFamily: 'monospace', flex: 1 }} />
                    </div>
                    <div style={{ height: 52, borderRadius: 10, background: targetHex, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: contrastColor(targetHex) }}>
                        {targetHex.toUpperCase()}
                    </div>
                </div>
            )}
            {inputMode === 'camera' && (
                <div style={{ marginBottom: 12 }}><CameraPickerUI camera={camera} /></div>
            )}
            {inputMode === 'photo' && (
                <div style={{ marginBottom: 12 }}>
                    <PhotoColorPicker pickedHex={pickedFromPhoto} onColorPicked={({ hex }) => setPickedFromPhoto(hex)} />
                    {pickedFromPhoto && <div style={{ marginTop: 10, height: 48, borderRadius: 10, background: pickedFromPhoto, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: contrastColor(pickedFromPhoto) }}>{pickedFromPhoto.toUpperCase()}</div>}
                </div>
            )}

            <button className="btn btn-primary w-full" style={{ marginBottom: guide ? 14 : 0 }} onClick={compute} disabled={loading || (inputMode === 'photo' && !pickedFromPhoto) || (inputMode === 'camera' && !camera.capturedColor)} id="compute-mix-btn">
                {loading ? '⏳ Computing…' : '🧪 Compute Mix'}
            </button>

            {guide && (
                <>
                    <MixResultCard guide={guide} />
                    <button className="btn btn-ghost w-full" style={{ marginTop: 10 }} onClick={() => setShowFix(!showFix)}>
                        {showFix ? '▲' : '▼'} 🔬 Fix My Mix
                    </button>
                    {showFix && <FixMyMixPanel targetHex={activeHex} paints={paints} />}
                </>
            )}
        </>
    )
}

// ─── Mix Palette tab ──────────────────────────────────────────────────────────
function MixPaletteTab({ paints }) {
    const [palettes, setPalettes] = useState([])
    const [selectedId, setSelectedId] = useState(() => sessionStorage.getItem('mix-palette-id') || '')
    const [results, setResults] = useState(null)
    const [loading, setLoading] = useState(false)
    const [openFixHex, setOpenFixHex] = useState(null)
    const toast = useToast()

    useEffect(() => {
        getAllPalettes().then(data => {
            const sorted = data.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
            setPalettes(sorted)
            // Take from sessionStorage first, then fall back to first palette
            const stored = sessionStorage.getItem('mix-palette-id')
            if (stored && sorted.find(p => p.id === stored)) {
                setSelectedId(stored)
                sessionStorage.removeItem('mix-palette-id')
            } else if (!selectedId && sorted.length > 0) {
                setSelectedId(sorted[0].id)
            }
        })
    }, [])

    const selectedPalette = palettes.find(p => p.id === selectedId)

    function mixAll() {
        if (paints.length === 0) { toast('Add paints to your library first'); return }
        if (!selectedPalette) { toast('Select a palette first'); return }
        setLoading(true)
        setOpenFixHex(null)
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
            <div className="empty-state">
                <div className="empty-icon">✨</div>
                <h3>No saved palettes</h3>
                <p>Generate a palette in the Palettes tab and save it.</p>
            </div>
        )
    }

    return (
        <>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 12 }}>
                <select className="select" value={selectedId} onChange={e => { setSelectedId(e.target.value); setResults(null); setOpenFixHex(null) }} id="palette-select" style={{ marginBottom: 10 }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{results.name}</div>
                    {results.items.map(({ hex, guide }, i) => (
                        <div key={i}>
                            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                                <div style={{ width: 18, height: 18, borderRadius: 4, background: hex, border: '1px solid var(--border)' }} />
                                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-faint)', flex: 1 }}>{hex}</span>
                                {/* Fix My Mix toggle */}
                                <button
                                    onClick={() => setOpenFixHex(openFixHex === hex ? null : hex)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        background: openFixHex === hex ? 'rgba(124,106,247,0.15)' : 'var(--bg-card2)',
                                        border: `1px solid ${openFixHex === hex ? 'var(--accent)' : 'var(--border)'}`,
                                        color: openFixHex === hex ? 'var(--accent)' : 'var(--text-muted)',
                                        borderRadius: 999, padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                    }}
                                >
                                    🔬 Fix My Mix {openFixHex === hex ? '▲' : '▼'}
                                </button>
                            </div>
                            <MixResultCard guide={guide} />
                            {openFixHex === hex && <FixMyMixPanel targetHex={hex} paints={paints} />}
                        </div>
                    ))}
                </div>
            )}
        </>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MixGuide() {
    const [mode, setMode] = useState('single')
    const [paints, setPaints] = useState([])
    const toast = useToast()

    useEffect(() => {
        getAllPaints().then(setPaints)
        // Redirect to palette tab if coming from Palettes page
        if (sessionStorage.getItem('mix-palette-id')) setMode('palette')
    }, [])

    return (
        <div className="page">
            <div className="page-header">
                <h1>🧪 Mix Guide</h1>
                <p>Compute mixing recipes from your paint library</p>
            </div>

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
                <SingleColorTab paints={paints} />
            ) : (
                <MixPaletteTab paints={paints} />
            )}
        </div>
    )
}

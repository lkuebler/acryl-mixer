import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllPaints } from '../db/db.js'
import { getAllPalettes, addPalette, deletePalette } from '../db/db.js'
import { generatePalette, twoColorMix, HARMONY_MODES, contrastColor } from '../utils/colorHarmony.js'
import { getMixingGuide } from '../utils/colorMix.js'
import { fetchHuemintPalette } from '../utils/huemint.js'
import { useToast } from '../components/Toast.jsx'
import ColorWheelPicker from '../components/ColorWheelPicker.jsx'
import PhotoColorPicker from '../components/PhotoColorPicker.jsx'
import chroma from 'chroma-js'

const HARMONY_MODES_GENERATE = Object.fromEntries(
    Object.entries(HARMONY_MODES).filter(([k]) => k !== 'random')
)

export default function PaletteGen() {
    const [paints, setPaints] = useState([])
    const [savedPalettes, setSavedPalettes] = useState([])
    const [tab, setTab] = useState('generate')
    const toast = useToast()

    useEffect(() => {
        getAllPaints().then(setPaints)
        loadSaved()
    }, [])

    async function loadSaved() {
        const data = await getAllPalettes()
        setSavedPalettes(data.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)))
    }

    async function handleDelete(id) {
        await deletePalette(id)
        await loadSaved()
        toast('Palette deleted')
    }

    async function handleSaveNew(paletteData) {
        await addPalette(paletteData)
        await loadSaved()
        toast('Palette saved ✓')
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1>✨ Palettes</h1>
                <p>Generate or craft harmonious color combinations</p>
            </div>

            <div className="tab-pills">
                <button className={`tab-pill ${tab === 'generate' ? 'active' : ''}`} onClick={() => setTab('generate')}>Generate</button>
                <button className={`tab-pill ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>Manual</button>
                <button className={`tab-pill ${tab === 'saved' ? 'active' : ''}`} onClick={() => setTab('saved')}>Saved ({savedPalettes.length})</button>
            </div>

            {tab === 'generate' && <GenerateTab paints={paints} onSave={handleSaveNew} />}
            {tab === 'manual' && <ManualTab paints={paints} onSave={handleSaveNew} />}
            {tab === 'saved' && (
                <>
                    {savedPalettes.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">✨</div>
                            <h3>No saved palettes</h3>
                            <p>Generate or build a palette, then save it here.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {savedPalettes.map(p => (
                                <SavedPaletteCard key={p.id} palette={p} paints={paints} onDelete={() => handleDelete(p.id)} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

// ── Generate Tab ──────────────────────────────────────────────────────────────
function GenerateTab({ paints, onSave }) {
    // ── Mode comes FIRST ──
    const [generateMode, setGenerateMode] = useState('harmony')
    const [harmonyMode, setHarmonyMode] = useState('analogous')
    const [count, setCount] = useState(5)
    const [palette, setPalette] = useState([])
    const [paletteName, setPaletteName] = useState('')
    const [aiLoading, setAiLoading] = useState(false)

    // ── Seed (only shown for harmony / random) ──
    const [seedMode, setSeedMode] = useState('picker')
    const [seedHex, setSeedHex] = useState('#7c6af7')
    const [photoPickedHex, setPhotoPickedHex] = useState(null)
    const [cameraActive, setCameraActive] = useState(false)
    const [liveColor, setLiveColor] = useState(null)

    // ── Two-color mix ──
    const [color1, setColor1] = useState('')
    const [color2, setColor2] = useState('')

    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const intervalRef = useRef(null)
    const toast = useToast()

    const showSeed = generateMode === 'harmony' || generateMode === 'random'
    const activeSeed = seedMode === 'photo' && photoPickedHex ? photoPickedHex :
        seedMode === 'camera' && liveColor ? liveColor : seedHex

    // Initialise color pickers with first library color when available
    useEffect(() => {
        if (paints.length >= 2) {
            setColor1(paints[0].hex)
            setColor2(paints[1].hex)
        }
    }, [paints])

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

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            streamRef.current = stream
            if (videoRef.current) videoRef.current.srcObject = stream
            setCameraActive(true)
        } catch { toast('Camera not available') }
    }
    function stopCamera() {
        clearInterval(intervalRef.current)
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        setCameraActive(false); setLiveColor(null)
    }
    useEffect(() => () => stopCamera(), []) // eslint-disable-line

    function switchSeedMode(m) {
        if (m !== 'camera') stopCamera()
        if (m === 'camera') startCamera()
        setSeedMode(m)
    }

    function captureCameraColor() {
        if (!liveColor) return
        setSeedHex(liveColor); stopCamera(); setSeedMode('picker')
        toast('Color captured ✓')
    }

    function generate() {
        let colors
        if (generateMode === 'random') {
            colors = generatePalette(activeSeed, 'random', count)
            setPaletteName('Random Palette')
        } else if (generateMode === 'twocolor') {
            if (!color1 || !color2) { toast('Select two colors from your library'); return }
            colors = twoColorMix(color1, color2, count)
            const p1 = paints.find(p => p.hex === color1)
            const p2 = paints.find(p => p.hex === color2)
            setPaletteName(`${p1?.name || 'Color 1'} → ${p2?.name || 'Color 2'}`)
        } else {
            colors = generatePalette(activeSeed, harmonyMode, count)
            setPaletteName(`${HARMONY_MODES[harmonyMode]} Palette`)
        }
        setPalette(colors)
    }

    async function generateAI() {
        setAiLoading(true)
        setPalette([])
        try {
            const colors = await fetchHuemintPalette(count)
            setPalette(colors)
            setPaletteName('AI Palette')
        } catch (err) {
            const msg = err?.name === 'AbortError' ? 'AI palette timed out — try again' : 'AI palette unavailable — try harmony mode instead'
            toast(msg)
        }
        setAiLoading(false)
    }

    async function savePalette() {
        if (palette.length === 0) { toast('Generate a palette first'); return }
        const name = paletteName || `Palette ${Date.now()}`
        await onSave({ name, colors: palette, mode: generateMode === 'harmony' ? harmonyMode : generateMode, seed: activeSeed })
    }

    return (
        <>
            {/* ── 1. Mode selection first ── */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ marginBottom: 10 }}>Mode</div>
                <select className="select" value={generateMode} onChange={e => { setGenerateMode(e.target.value); setPalette([]) }} id="generate-mode-select" style={{ marginBottom: harmonyMode && generateMode === 'harmony' ? 12 : 0 }}>
                    <option value="harmony">Harmony (seed color)</option>
                    <option value="random">Random</option>
                    <option value="twocolor">2-Color Mix (library)</option>
                    <option value="ai">AI Palette (Huemint)</option>
                </select>

                {generateMode === 'harmony' && (
                    <select className="select" value={harmonyMode} onChange={e => setHarmonyMode(e.target.value)} id="harmony-select">
                        {Object.entries(HARMONY_MODES_GENERATE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                )}

                {generateMode === 'twocolor' && paints.length < 2 && (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>
                        Add at least 2 paints to your library to use 2-color mix.
                    </div>
                )}

                {generateMode === 'twocolor' && paints.length >= 2 && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <div className="section-label" style={{ marginBottom: 6 }}>Color A</div>
                            <select className="select" value={color1} onChange={e => setColor1(e.target.value)}>
                                {paints.map(p => <option key={p.id} value={p.hex}>{p.name}</option>)}
                            </select>
                            <div style={{ height: 28, borderRadius: 6, background: color1, marginTop: 6, border: '1px solid var(--border)' }} />
                        </div>
                        <div style={{ fontSize: 20, paddingTop: 20 }}>↔</div>
                        <div style={{ flex: 1 }}>
                            <div className="section-label" style={{ marginBottom: 6 }}>Color B</div>
                            <select className="select" value={color2} onChange={e => setColor2(e.target.value)}>
                                {paints.map(p => <option key={p.id} value={p.hex}>{p.name}</option>)}
                            </select>
                            <div style={{ height: 28, borderRadius: 6, background: color2, marginTop: 6, border: '1px solid var(--border)' }} />
                        </div>
                    </div>
                )}

                <div style={{ marginTop: 12 }}>
                    <label className="label" style={{ marginBottom: 4 }}>Colors: {count}</label>
                    <input type="range" min={3} max={10} value={count} onChange={e => setCount(Number(e.target.value))} id="count-slider" />
                    <div className="flex justify-between text-xs text-muted mt-2"><span>3</span><span>10</span></div>
                </div>
            </div>

            {/* ── 2. Seed color (only for harmony/random) ── */}
            {showSeed && (
                <div className="card" style={{ marginBottom: 16 }}>
                    <div className="section-label" style={{ marginBottom: 10 }}>Seed Color</div>
                    <div className="tab-pills" style={{ marginBottom: 12 }}>
                        <button className={`tab-pill ${seedMode === 'picker' ? 'active' : ''}`} onClick={() => switchSeedMode('picker')}>🎨 Picker</button>
                        <button className={`tab-pill ${seedMode === 'camera' ? 'active' : ''}`} onClick={() => switchSeedMode('camera')}>📷 Camera</button>
                        <button className={`tab-pill ${seedMode === 'photo' ? 'active' : ''}`} onClick={() => switchSeedMode('photo')}>🖼️ Photo</button>
                    </div>

                    {seedMode === 'picker' && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <ColorWheelPicker hex={seedHex} onChange={setSeedHex} />
                            </div>
                            {paints.length > 0 && (
                                <>
                                    <div className="section-label" style={{ margin: '12px 0 8px' }}>Or from library</div>
                                    <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
                                        {paints.slice(0, 16).map(p => (
                                            <button key={p.id} className="swatch" style={{ background: p.hex, cursor: 'pointer', border: seedHex === p.hex ? '2px solid var(--accent)' : undefined }} title={p.name} onClick={() => setSeedHex(p.hex)} />
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {seedMode === 'camera' && (
                        <>
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                            <div className="camera-wrapper">
                                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%' }} />
                                <div className="camera-crosshair" />
                                {liveColor && <div style={{ position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: '50%', background: liveColor, border: '3px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 16px rgba(0,0,0,0.6)' }} />}
                            </div>
                            <button className="btn btn-primary w-full mt-3" onClick={captureCameraColor} disabled={!liveColor}>📸 Use This Color</button>
                        </>
                    )}

                    {seedMode === 'photo' && (
                        <PhotoColorPicker pickedHex={photoPickedHex} onColorPicked={({ hex }) => setPhotoPickedHex(hex)} />
                    )}

                    <div style={{ marginTop: 12, height: 36, borderRadius: 8, background: activeSeed, border: '1px solid var(--border)', transition: 'background 0.2s' }} />
                </div>
            )}

            {/* ── Generate button ── */}
            {generateMode === 'ai' ? (
                <button className="btn btn-primary w-full" style={{ marginBottom: 16 }} onClick={generateAI} disabled={aiLoading} id="generate-btn">
                    {aiLoading ? '⏳ Generating AI Palette…' : '🤖 Generate AI Palette'}
                </button>
            ) : (
                <button className="btn btn-primary w-full" style={{ marginBottom: 16 }} onClick={generate} id="generate-btn">
                    ✨ Generate Palette
                </button>
            )}

            {/* ── Result ── */}
            {palette.length > 0 && (
                <div className="card">
                    <div className="section-label" style={{ marginBottom: 12 }}>Result</div>
                    <div className="palette-strip" style={{ marginBottom: 16 }}>
                        {palette.map((hex, i) => (
                            <div key={i} className="palette-strip-cell" style={{ background: hex }} title={hex} onClick={() => { navigator.clipboard?.writeText(hex); toast(`Copied ${hex}`) }} />
                        ))}
                    </div>
                    <div className="flex" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                        {palette.map((hex, i) => (
                            <div key={i} style={{ flex: '1', minWidth: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-sm)', background: hex }} />
                                <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{hex}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <input className="input" value={paletteName} onChange={e => setPaletteName(e.target.value)} placeholder="Palette name…" style={{ flex: 1 }} id="palette-name-input" />
                        <button className="btn btn-primary" onClick={savePalette} id="save-palette-btn">Save</button>
                    </div>
                </div>
            )}
        </>
    )
}

// ── Manual Tab ────────────────────────────────────────────────────────────────
function ManualTab({ paints, onSave }) {
    const [colorTab, setColorTab] = useState('picker')
    const [currentHex, setCurrentHex] = useState('#7c6af7')
    const [photoPickedHex, setPhotoPickedHex] = useState(null)
    const [cameraHex, setCameraHex] = useState(null)
    const [cameraActive, setCameraActive] = useState(false)
    const [liveColor, setLiveColor] = useState(null)
    const [colors, setColors] = useState([])
    const [paletteName, setPaletteName] = useState('My Palette')
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const intervalRef = useRef(null)
    const toast = useToast()

    const activeHex = colorTab === 'photo' && photoPickedHex ? photoPickedHex :
        colorTab === 'camera' && cameraHex ? cameraHex : currentHex

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

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            streamRef.current = stream
            if (videoRef.current) videoRef.current.srcObject = stream
            setCameraActive(true)
        } catch { toast('Camera not available') }
    }
    function stopCamera() {
        clearInterval(intervalRef.current)
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null; setCameraActive(false); setLiveColor(null)
    }
    useEffect(() => () => stopCamera(), []) // eslint-disable-line

    function switchColorTab(t) {
        if (t !== 'camera') stopCamera()
        if (t === 'camera') startCamera()
        setColorTab(t)
    }

    function captureCameraColor() {
        if (!liveColor) return
        setCameraHex(liveColor); stopCamera(); setColorTab('picker'); setCurrentHex(liveColor)
        toast('Color captured ✓')
    }

    function addColor() {
        if (colors.length >= 10) { toast('Maximum 10 colors per palette'); return }
        setColors([...colors, activeHex])
    }

    async function save() {
        if (colors.length < 3) { toast('Add at least 3 colors'); return }
        if (!paletteName.trim()) { toast('Enter a palette name'); return }
        await onSave({ name: paletteName.trim(), colors, mode: 'manual', seed: null })
        setColors([]); setPaletteName('My Palette')
        toast('Palette saved ✓')
    }

    return (
        <>
            {colors.length > 0 && (
                <div className="card" style={{ marginBottom: 16 }}>
                    <div className="section-label" style={{ marginBottom: 10 }}>Your Colors ({colors.length}/10) {colors.length < 3 && <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 6 }}>min 3</span>}</div>
                    <div className="palette-strip" style={{ marginBottom: 12 }}>
                        {colors.map((hex, i) => <div key={i} className="palette-strip-cell" style={{ background: hex }} title={hex} />)}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {colors.map((hex, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 8, background: hex, border: '1px solid var(--border)' }} />
                                <button onClick={() => setColors(colors.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 12, padding: 0 }} title="Remove">✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="card" style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ marginBottom: 10 }}>Pick a Color</div>
                <div className="tab-pills" style={{ marginBottom: 12 }}>
                    <button className={`tab-pill ${colorTab === 'picker' ? 'active' : ''}`} onClick={() => switchColorTab('picker')}>🎨 Picker</button>
                    <button className={`tab-pill ${colorTab === 'camera' ? 'active' : ''}`} onClick={() => switchColorTab('camera')}>📷 Camera</button>
                    <button className={`tab-pill ${colorTab === 'photo' ? 'active' : ''}`} onClick={() => switchColorTab('photo')}>🖼️ Photo</button>
                </div>

                {colorTab === 'picker' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <ColorWheelPicker hex={currentHex} onChange={setCurrentHex} />
                        </div>
                        {paints.length > 0 && (
                            <>
                                <div className="section-label" style={{ margin: '12px 0 8px' }}>From library</div>
                                <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
                                    {paints.slice(0, 16).map(p => (
                                        <button key={p.id} className="swatch" style={{ background: p.hex, cursor: 'pointer', border: currentHex === p.hex ? '2px solid var(--accent)' : undefined }} title={p.name} onClick={() => setCurrentHex(p.hex)} />
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}

                {colorTab === 'camera' && (
                    <>
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        <div className="camera-wrapper">
                            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%' }} />
                            <div className="camera-crosshair" />
                            {liveColor && <div style={{ position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: '50%', background: liveColor, border: '3px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 16px rgba(0,0,0,0.6)' }} />}
                        </div>
                        <button className="btn btn-primary w-full mt-3" onClick={captureCameraColor} disabled={!liveColor}>📸 Use This Color</button>
                    </>
                )}

                {colorTab === 'photo' && (
                    <PhotoColorPicker pickedHex={photoPickedHex} onColorPicked={({ hex }) => setPhotoPickedHex(hex)} />
                )}

                <div style={{ marginTop: 14, height: 44, borderRadius: 8, background: activeHex, border: '1px solid var(--border)', marginBottom: 10, transition: 'background 0.2s' }} />
                <button className="btn btn-primary w-full" onClick={addColor} disabled={colors.length >= 10}>+ Add This Color</button>
            </div>

            <div className="card">
                <div className="field" style={{ marginBottom: 12 }}>
                    <label className="label">Palette Name</label>
                    <input className="input" value={paletteName} onChange={e => setPaletteName(e.target.value)} placeholder="My Palette" />
                </div>
                <button className="btn btn-primary w-full" onClick={save} disabled={colors.length < 3}>
                    💾 Save Palette ({colors.length} colors)
                </button>
            </div>
        </>
    )
}

// ── Fix My Mix inline panel ───────────────────────────────────────────────────
function FixMyMixPanel({ targetHex, paints }) {
    const [mode, setMode] = useState('photo')
    const [currentHex, setCurrentHex] = useState(null)
    const [result, setResult] = useState(null)
    const camera = useCameraColor()
    const toast = useToast()

    function computeFix() {
        if (!currentHex) { toast('Pick your current color first'); return }
        const targetGuide = getMixingGuide(targetHex, paints)
        const currentGuide = getMixingGuide(currentHex, paints)
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
        setResult({ deltas })
    }

    return (
        <div style={{ marginTop: 12, padding: 14, background: 'rgba(124,106,247,0.06)', borderRadius: 12, border: '1px solid rgba(124,106,247,0.15)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>🔬 Fix My Mix</div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 10 }}>Pick your current mixed color to get adjustment suggestions.</div>

            <div className="tab-pills" style={{ marginBottom: 12 }}>
                <button className={`tab-pill ${mode === 'photo' ? 'active' : ''}`} onClick={() => { setMode('photo'); camera.stop() }}>🖼️ Photo</button>
                <button className={`tab-pill ${mode === 'camera' ? 'active' : ''}`} onClick={() => { setMode('camera'); camera.start() }}>📷 Camera</button>
            </div>

            {mode === 'photo' && (
                <PhotoColorPicker pickedHex={currentHex} onColorPicked={({ hex }) => setCurrentHex(hex)} />
            )}
            {mode === 'camera' && (
                <>
                    {camera.capturedColor ? (
                        <div>
                            <div style={{ height: 60, borderRadius: 8, background: camera.capturedColor, marginBottom: 8, border: '1px solid var(--border)' }} />
                            <button className="btn btn-ghost w-full" style={{ marginBottom: 8 }} onClick={() => { camera.reset(); camera.start() }}>🔄 Retake</button>
                        </div>
                    ) : (
                        <>
                            <div className="camera-wrapper">
                                <video ref={camera.videoRef} autoPlay playsInline muted style={{ width: '100%' }} />
                                <div className="camera-crosshair" />
                                {camera.liveColor && <div style={{ position: 'absolute', top: 12, right: 12, width: 40, height: 40, borderRadius: '50%', background: camera.liveColor, border: '3px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }} />}
                            </div>
                            <canvas ref={camera.canvasRef} style={{ display: 'none' }} />
                            <button className="btn btn-primary w-full mt-3" onClick={() => { camera.capture(); setCurrentHex(camera.liveColor) }} disabled={!camera.liveColor}>📸 This Is My Current Color</button>
                        </>
                    )}
                </>
            )}

            {(currentHex || camera.capturedColor) && (
                <>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, marginBottom: 10 }}>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 4 }}>Current</div>
                            <div style={{ height: 32, borderRadius: 6, background: currentHex || camera.capturedColor, border: '1px solid var(--border)' }} />
                        </div>
                        <div style={{ fontSize: 16 }}>→</div>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 4 }}>Target</div>
                            <div style={{ height: 32, borderRadius: 6, background: targetHex, border: '1px solid var(--border)' }} />
                        </div>
                    </div>
                    <button className="btn btn-primary w-full" onClick={computeFix} style={{ marginBottom: result ? 10 : 0 }}>🔬 Get Adjustments</button>
                </>
            )}

            {result && (
                result.deltas.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '8px 0' }}>✓ Already very close to target!</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {result.deltas.sort((a, b) => b.delta - a.delta).map((d, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                <div style={{ width: 20, height: 20, borderRadius: 4, background: d.paint.hex, border: '1px solid var(--border)', flexShrink: 0 }} />
                                <div style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{d.paint.name}</div>
                                <div style={{ background: 'linear-gradient(135deg, var(--accent), #9b8cf7)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 800 }}>+{d.delta}%</div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    )
}

// ── Camera hook (shared) ──────────────────────────────────────────────────────
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

// ── Saved Palette Card ────────────────────────────────────────────────────────
function SavedPaletteCard({ palette, paints, onDelete }) {
    const navigate = useNavigate()
    const [openFixHex, setOpenFixHex] = useState(null)  // which color has Fix My Mix open

    const modeLabel = palette.mode === 'manual' ? 'Manual' :
        palette.mode === 'random' ? 'Random' :
            palette.mode === 'twocolor' ? '2-Color Mix' :
                palette.mode === 'ai' ? 'AI Palette' :
                    HARMONY_MODES[palette.mode] || palette.mode

    function goToMix() {
        // Store palette id in sessionStorage so MixGuide can pick it up
        sessionStorage.setItem('mix-palette-id', palette.id)
        navigate('/mix')
    }

    return (
        <div className="card">
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <div>
                    <div className="font-semibold" style={{ fontSize: 14 }}>{palette.name}</div>
                    <div className="text-xs text-muted">{modeLabel} · {palette.colors.length} colors</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        className="btn btn-ghost"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={goToMix}
                        title="Mix this palette"
                    >
                        🧪 Mix
                    </button>
                    <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }} onClick={onDelete}>Delete</button>
                </div>
            </div>

            <div className="palette-strip" style={{ height: 48, borderRadius: 'var(--radius-sm)', marginBottom: 10 }}>
                {palette.colors.map((hex, i) => (
                    <div key={i} style={{ background: hex, flex: 1 }} title={hex} />
                ))}
            </div>

            {/* Per-color Fix My Mix toggles */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {palette.colors.map((hex, i) => (
                    <div key={i}>
                        <button
                            onClick={() => setOpenFixHex(openFixHex === hex ? null : hex)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                background: openFixHex === hex ? 'rgba(124,106,247,0.15)' : 'var(--bg-card2)',
                                border: `1px solid ${openFixHex === hex ? 'var(--accent)' : 'var(--border)'}`,
                                borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 600,
                                cursor: 'pointer', color: openFixHex === hex ? 'var(--accent)' : 'var(--text-muted)',
                            }}
                            title={`Fix My Mix for ${hex}`}
                        >
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: hex, border: '1px solid rgba(255,255,255,0.2)' }} />
                            {hex}
                            {openFixHex === hex ? ' ▲' : ' 🔬'}
                        </button>
                        {openFixHex === hex && paints.length > 0 && (
                            <FixMyMixPanel targetHex={hex} paints={paints} />
                        )}
                        {openFixHex === hex && paints.length === 0 && (
                            <div style={{ fontSize: 12, color: 'var(--text-faint)', padding: '8px 0' }}>Add paints to your library first.</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

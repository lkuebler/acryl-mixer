import { useState, useEffect, useRef } from 'react'
import { getAllPaints } from '../db/db.js'
import { getAllPalettes, addPalette, deletePalette } from '../db/db.js'
import { generatePalette, twoColorMix, HARMONY_MODES, contrastColor } from '../utils/colorHarmony.js'
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

            {tab === 'generate' && (
                <GenerateTab paints={paints} onSave={handleSaveNew} savedPalettes={savedPalettes} />
            )}

            {tab === 'manual' && (
                <ManualTab paints={paints} onSave={handleSaveNew} />
            )}

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
                                <SavedPaletteCard key={p.id} palette={p} onDelete={() => handleDelete(p.id)} />
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
    const [seedMode, setSeedMode] = useState('picker')  // 'picker' | 'camera' | 'photo'
    const [seedHex, setSeedHex] = useState('#7c6af7')
    const [photoPickedHex, setPhotoPickedHex] = useState(null)
    const [cameraActive, setCameraActive] = useState(false)
    const [liveColor, setLiveColor] = useState(null)
    const [harmonyMode, setHarmonyMode] = useState('analogous')
    const [generateMode, setGenerateMode] = useState('harmony') // 'harmony' | 'random' | 'twocolor' | 'ai'
    const [count, setCount] = useState(5)
    const [palette, setPalette] = useState([])
    const [paletteName, setPaletteName] = useState('')
    const [aiLoading, setAiLoading] = useState(false)
    // Two-color mix
    const [color1, setColor1] = useState('#1B3F8B')
    const [color2, setColor2] = useState('#E8C76B')
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const intervalRef = useRef(null)
    const toast = useToast()

    const activeSeed = seedMode === 'photo' && photoPickedHex ? photoPickedHex :
        seedMode === 'camera' && liveColor ? liveColor : seedHex

    // Camera
    useEffect(() => {
        if (!cameraActive) return
        intervalRef.current = setInterval(() => {
            const video = videoRef.current
            const canvas = canvasRef.current
            if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) return
            canvas.width = video.videoWidth; canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            ctx.drawImage(video, 0, 0)
            const cx = Math.floor(video.videoWidth / 2), cy = Math.floor(video.videoHeight / 2)
            const d = ctx.getImageData(cx, cy, 1, 1).data
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
        setSeedHex(liveColor)
        stopCamera()
        setSeedMode('picker')
        toast('Color captured ✓')
    }

    function generate() {
        let colors
        if (generateMode === 'random') {
            colors = generatePalette(activeSeed, 'random', count)
            setPaletteName('Random Palette')
        } else if (generateMode === 'twocolor') {
            colors = twoColorMix(color1, color2, count)
            setPaletteName('2-Color Mix Palette')
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
            const body = {
                mode: 'transformer',
                num_colors: count,
                temperature: 1.2,
                num_results: 1,
                adjacency: Array(count * count).fill('0').join(' '),
                palette: [...Array(count)].map(() => '-'),
            }
            const res = await fetch('https://huemint.com/api/color', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(10000),
            })
            const data = await res.json()
            const colors = data.results?.[0]?.palette || []
            if (colors.length === 0) throw new Error('No palette returned')
            setPalette(colors)
            setPaletteName('AI Palette')
        } catch {
            toast('AI palette unavailable — try harmony mode instead')
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
            {/* Seed color section */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ marginBottom: 10 }}>Seed Color</div>
                <div className="tab-pills" style={{ marginBottom: 12 }}>
                    <button className={`tab-pill ${seedMode === 'picker' ? 'active' : ''}`} onClick={() => switchSeedMode('picker')}>🎨 Picker</button>
                    <button className={`tab-pill ${seedMode === 'camera' ? 'active' : ''}`} onClick={() => switchSeedMode('camera')}>📷 Camera</button>
                    <button className={`tab-pill ${seedMode === 'photo' ? 'active' : ''}`} onClick={() => switchSeedMode('photo')}>🖼️ Photo</button>
                </div>

                {seedMode === 'picker' && (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <ColorWheelPicker hex={seedHex} onChange={setSeedHex} />
                    </div>
                )}

                {seedMode === 'camera' && (
                    <>
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        <div className="camera-wrapper">
                            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%' }} />
                            <div className="camera-crosshair" />
                            {liveColor && (
                                <div style={{ position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: '50%', background: liveColor, border: '3px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 16px rgba(0,0,0,0.6)' }} />
                            )}
                        </div>
                        <button className="btn btn-primary w-full mt-3" onClick={captureCameraColor} disabled={!liveColor}>📸 Use This Color</button>
                    </>
                )}

                {seedMode === 'photo' && (
                    <PhotoColorPicker
                        pickedHex={photoPickedHex}
                        onColorPicked={({ hex }) => setPhotoPickedHex(hex)}
                    />
                )}

                {/* Current seed preview */}
                {generateMode !== 'twocolor' && (
                    <div style={{ marginTop: 12, height: 36, borderRadius: 8, background: activeSeed, border: '1px solid var(--border)' }} />
                )}

                {paints.length > 0 && generateMode !== 'twocolor' && (
                    <>
                        <div className="section-label" style={{ margin: '12px 0 8px' }}>Or pick from library</div>
                        <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
                            {paints.slice(0, 16).map(p => (
                                <button
                                    key={p.id}
                                    className="swatch"
                                    style={{ background: p.hex, cursor: 'pointer', border: activeSeed === p.hex ? '2px solid var(--accent)' : undefined }}
                                    title={p.name}
                                    onClick={() => { setSeedHex(p.hex); setSeedMode('picker') }}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Generate mode */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="field" style={{ marginBottom: 12 }}>
                    <label className="label">Mode</label>
                    <select className="select" value={generateMode} onChange={e => setGenerateMode(e.target.value)} id="generate-mode-select">
                        <option value="harmony">Harmony (from seed)</option>
                        <option value="random">Random Palette</option>
                        <option value="twocolor">2-Color Mix (library)</option>
                        <option value="ai">AI Palette (Huemint)</option>
                    </select>
                </div>

                {generateMode === 'harmony' && (
                    <div className="field" style={{ marginBottom: 12 }}>
                        <label className="label">Harmony</label>
                        <select className="select" value={harmonyMode} onChange={e => setHarmonyMode(e.target.value)} id="harmony-select">
                            {Object.entries(HARMONY_MODES_GENERATE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                )}

                {generateMode === 'twocolor' && (
                    <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
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

                <div className="field" style={{ marginBottom: 0 }}>
                    <label className="label" style={{ marginBottom: 4 }}>Colors: {count}</label>
                    <input
                        type="range" min={3} max={10} value={count}
                        onChange={e => setCount(Number(e.target.value))}
                        id="count-slider"
                    />
                    <div className="flex justify-between text-xs text-muted mt-2">
                        <span>3</span><span>10</span>
                    </div>
                </div>
            </div>

            {generateMode === 'ai' ? (
                <button className="btn btn-primary w-full" style={{ marginBottom: 16 }} onClick={generateAI} disabled={aiLoading} id="generate-btn">
                    {aiLoading ? '⏳ Generating…' : '🤖 Generate AI Palette'}
                </button>
            ) : (
                <button className="btn btn-primary w-full" style={{ marginBottom: 16 }} onClick={generate} id="generate-btn">
                    ✨ Generate Palette
                </button>
            )}

            {palette.length > 0 && (
                <div className="card">
                    <div className="section-label" style={{ marginBottom: 12 }}>Result</div>
                    <div className="palette-strip" style={{ marginBottom: 16 }}>
                        {palette.map((hex, i) => (
                            <div
                                key={i}
                                className="palette-strip-cell"
                                style={{ background: hex }}
                                title={hex}
                                onClick={() => { navigator.clipboard?.writeText(hex); toast(`Copied ${hex}`) }}
                            />
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
                        <input
                            className="input"
                            value={paletteName}
                            onChange={e => setPaletteName(e.target.value)}
                            placeholder="Palette name…"
                            style={{ flex: 1 }}
                            id="palette-name-input"
                        />
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
            const video = videoRef.current
            const canvas = canvasRef.current
            if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) return
            canvas.width = video.videoWidth; canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            ctx.drawImage(video, 0, 0)
            const cx = Math.floor(video.videoWidth / 2), cy = Math.floor(video.videoHeight / 2)
            const d = ctx.getImageData(cx, cy, 1, 1).data
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

    function switchColorTab(t) {
        if (t !== 'camera') stopCamera()
        if (t === 'camera') startCamera()
        setColorTab(t)
    }

    function captureCameraColor() {
        if (!liveColor) return
        setCameraHex(liveColor)
        stopCamera()
        setColorTab('picker')
        setCurrentHex(liveColor)
        toast('Color captured ✓')
    }

    function addColor() {
        if (colors.length >= 10) { toast('Maximum 10 colors per palette'); return }
        setColors([...colors, activeHex])
    }

    function removeColor(i) {
        setColors(colors.filter((_, idx) => idx !== i))
    }

    async function save() {
        if (colors.length < 3) { toast('Add at least 3 colors'); return }
        if (!paletteName.trim()) { toast('Enter a palette name'); return }
        await onSave({ name: paletteName.trim(), colors, mode: 'manual', seed: null })
        setColors([])
        setPaletteName('My Palette')
        toast('Palette saved ✓')
    }

    return (
        <>
            {/* Color slots */}
            {colors.length > 0 && (
                <div className="card" style={{ marginBottom: 16 }}>
                    <div className="section-label" style={{ marginBottom: 10 }}>
                        Your Colors ({colors.length}/10)
                        {colors.length < 3 && <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 6 }}>min 3</span>}
                    </div>
                    <div className="palette-strip" style={{ marginBottom: 12 }}>
                        {colors.map((hex, i) => (
                            <div key={i} className="palette-strip-cell" style={{ background: hex, position: 'relative' }} title={hex} />
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {colors.map((hex, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 8, background: hex, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                </div>
                                <button
                                    onClick={() => removeColor(i)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 12, padding: 0 }}
                                    title="Remove"
                                >✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Color picker */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ marginBottom: 10 }}>Pick a Color</div>
                <div className="tab-pills" style={{ marginBottom: 12 }}>
                    <button className={`tab-pill ${colorTab === 'picker' ? 'active' : ''}`} onClick={() => switchColorTab('picker')}>🎨 Picker</button>
                    <button className={`tab-pill ${colorTab === 'camera' ? 'active' : ''}`} onClick={() => switchColorTab('camera')}>📷 Camera</button>
                    <button className={`tab-pill ${colorTab === 'photo' ? 'active' : ''}`} onClick={() => switchColorTab('photo')}>🖼️ Photo</button>
                </div>

                {colorTab === 'picker' && (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <ColorWheelPicker hex={currentHex} onChange={setCurrentHex} />
                    </div>
                )}

                {colorTab === 'camera' && (
                    <>
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        <div className="camera-wrapper">
                            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%' }} />
                            <div className="camera-crosshair" />
                            {liveColor && (
                                <div style={{ position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: '50%', background: liveColor, border: '3px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 16px rgba(0,0,0,0.6)' }} />
                            )}
                        </div>
                        <button className="btn btn-primary w-full mt-3" onClick={captureCameraColor} disabled={!liveColor}>📸 Use This Color</button>
                    </>
                )}

                {colorTab === 'photo' && (
                    <PhotoColorPicker
                        pickedHex={photoPickedHex}
                        onColorPicked={({ hex }) => setPhotoPickedHex(hex)}
                    />
                )}

                {/* Library quick-pick */}
                {paints.length > 0 && colorTab === 'picker' && (
                    <>
                        <div className="section-label" style={{ margin: '12px 0 8px' }}>From library</div>
                        <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
                            {paints.slice(0, 16).map(p => (
                                <button
                                    key={p.id}
                                    className="swatch"
                                    style={{ background: p.hex, cursor: 'pointer', border: currentHex === p.hex ? '2px solid var(--accent)' : undefined }}
                                    title={p.name}
                                    onClick={() => setCurrentHex(p.hex)}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* Preview + Add */}
                <div style={{ marginTop: 14, height: 44, borderRadius: 8, background: activeHex, border: '1px solid var(--border)', marginBottom: 10, transition: 'background 0.2s' }} />
                <button
                    className="btn btn-primary w-full"
                    onClick={addColor}
                    disabled={colors.length >= 10}
                >
                    + Add This Color
                </button>
            </div>

            {/* Save */}
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

// ── Saved Palette Card ────────────────────────────────────────────────────────
function SavedPaletteCard({ palette, onDelete }) {
    const modeLabel = palette.mode === 'manual' ? 'Manual' :
        palette.mode === 'random' ? 'Random' :
            palette.mode === 'twocolor' ? '2-Color Mix' :
                palette.mode === 'ai' ? 'AI Palette' :
                    HARMONY_MODES[palette.mode] || palette.mode
    return (
        <div className="card">
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <div>
                    <div className="font-semibold" style={{ fontSize: 14 }}>{palette.name}</div>
                    <div className="text-xs text-muted">{modeLabel} · {palette.colors.length} colors</div>
                </div>
                <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }} onClick={onDelete}>Delete</button>
            </div>
            <div className="palette-strip" style={{ height: 48, borderRadius: 'var(--radius-sm)' }}>
                {palette.colors.map((hex, i) => (
                    <div key={i} style={{ background: hex, flex: 1 }} title={hex} />
                ))}
            </div>
            <div className="flex" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {palette.colors.map((hex, i) => (
                    <span key={i} style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{hex}</span>
                ))}
            </div>
        </div>
    )
}

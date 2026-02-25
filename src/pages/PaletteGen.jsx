import { useState, useEffect } from 'react'
import { getAllPaints } from '../db/db.js'
import { getAllPalettes, addPalette, deletePalette } from '../db/db.js'
import { generatePalette, HARMONY_MODES, contrastColor } from '../utils/colorHarmony.js'
import { useToast } from '../components/Toast.jsx'
import chroma from 'chroma-js'

const MODES = Object.keys(HARMONY_MODES)

export default function PaletteGen() {
    const [paints, setPaints] = useState([])
    const [savedPalettes, setSavedPalettes] = useState([])
    const [tab, setTab] = useState('generate')
    const [seedHex, setSeedHex] = useState('#7c6af7')
    const [harmonyMode, setHarmonyMode] = useState('analogous')
    const [count, setCount] = useState(5)
    const [palette, setPalette] = useState([])
    const [paletteName, setPaletteName] = useState('')
    const toast = useToast()

    useEffect(() => {
        getAllPaints().then(setPaints)
        loadSaved()
    }, [])

    async function loadSaved() {
        const data = await getAllPalettes()
        setSavedPalettes(data.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)))
    }

    function generate() {
        const colors = generatePalette(seedHex, harmonyMode, count)
        setPalette(colors)
        setPaletteName(`${HARMONY_MODES[harmonyMode]} Palette`)
    }

    async function savePalette() {
        if (palette.length === 0) { toast('Generate a palette first'); return }
        const name = paletteName || `Palette ${savedPalettes.length + 1}`
        await addPalette({ name, colors: palette, mode: harmonyMode, seed: seedHex })
        await loadSaved()
        toast('Palette saved ✓')
    }

    async function handleDelete(id) {
        await deletePalette(id)
        await loadSaved()
        toast('Palette deleted')
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1>✨ Palettes</h1>
                <p>Generate harmonious color combinations</p>
            </div>

            <div className="tab-pills">
                <button className={`tab-pill ${tab === 'generate' ? 'active' : ''}`} onClick={() => setTab('generate')}>Generate</button>
                <button className={`tab-pill ${tab === 'saved' ? 'active' : ''}`} onClick={() => setTab('saved')}>Saved ({savedPalettes.length})</button>
            </div>

            {tab === 'generate' && (
                <>
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="section-label" style={{ marginBottom: 12 }}>Seed Color</div>
                        <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
                            <input type="color" value={seedHex} onChange={e => setSeedHex(e.target.value)} id="seed-color-picker" />
                            <input
                                className="input"
                                value={seedHex}
                                onChange={e => setSeedHex(e.target.value)}
                                style={{ fontFamily: 'monospace' }}
                                id="seed-hex-input"
                            />
                        </div>

                        {paints.length > 0 && (
                            <>
                                <div className="section-label" style={{ marginBottom: 8 }}>Or pick from library</div>
                                <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
                                    {paints.slice(0, 16).map(p => (
                                        <button
                                            key={p.id}
                                            className="swatch"
                                            style={{ background: p.hex, cursor: 'pointer', border: seedHex === p.hex ? '2px solid var(--accent)' : undefined }}
                                            title={p.name}
                                            onClick={() => setSeedHex(p.hex)}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="field" style={{ marginBottom: 12 }}>
                            <label className="label">Harmony</label>
                            <select className="select" value={harmonyMode} onChange={e => setHarmonyMode(e.target.value)} id="harmony-select">
                                {MODES.map(m => <option key={m} value={m}>{HARMONY_MODES[m]}</option>)}
                            </select>
                        </div>

                        <div className="field" style={{ marginBottom: 0 }}>
                            <label className="label" style={{ marginBottom: 4 }}>Colors: {count}</label>
                            <input
                                type="range"
                                min={3}
                                max={8}
                                value={count}
                                onChange={e => setCount(Number(e.target.value))}
                                id="count-slider"
                            />
                            <div className="flex justify-between text-xs text-muted mt-2">
                                <span>3</span><span>8</span>
                            </div>
                        </div>
                    </div>

                    <button className="btn btn-primary w-full" style={{ marginBottom: 16 }} onClick={generate} id="generate-btn">
                        ✨ Generate Palette
                    </button>

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
                                    <div key={i} className="flex-col items-center gap-2" style={{ flex: '1', minWidth: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
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
            )}

            {tab === 'saved' && (
                <>
                    {savedPalettes.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">✨</div>
                            <h3>No saved palettes</h3>
                            <p>Generate a palette and save it to see it here.</p>
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

function SavedPaletteCard({ palette, onDelete }) {
    return (
        <div className="card">
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <div>
                    <div className="font-semibold" style={{ fontSize: 14 }}>{palette.name}</div>
                    {palette.mode && <div className="text-xs text-muted">{HARMONY_MODES[palette.mode]} · {palette.colors.length} colors</div>}
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

import { useState, useEffect, useRef } from 'react'
import { getAllPaints, addPaint, deletePaint, updatePaint } from '../db/db.js'
import { contrastColor } from '../utils/colorHarmony.js'
import { useToast } from '../components/Toast.jsx'
import PhotoColorPicker from '../components/PhotoColorPicker.jsx'
import ColorWheelPicker from '../components/ColorWheelPicker.jsx'
import { nameColor } from '../utils/ntc.js'
import chroma from 'chroma-js'

const STANDARD_COLORS = [
    // Whites & Blacks
    { name: 'Titanium White', hex: '#F2F0EC', brand: 'Generic' },
    { name: 'Zinc White', hex: '#E8E8E2', brand: 'Generic' },
    { name: 'Mars Black', hex: '#1C1C1E', brand: 'Generic' },
    { name: 'Ivory Black', hex: '#2B2B2A', brand: 'Generic' },
    // Reds
    { name: 'Cadmium Red', hex: '#E8291C', brand: 'Generic' },
    { name: 'Alizarin Crimson', hex: '#A20010', brand: 'Generic' },
    { name: 'Venetian Red', hex: '#B01B2E', brand: 'Generic' },
    { name: 'Quinacridone Magenta', hex: '#B0306A', brand: 'Generic' },
    // Oranges
    { name: 'Cadmium Orange', hex: '#E07B39', brand: 'Generic' },
    { name: 'Burnt Sienna', hex: '#B8490B', brand: 'Generic' },
    // Yellows
    { name: 'Cadmium Yellow', hex: '#E6C32A', brand: 'Generic' },
    { name: 'Yellow Ochre', hex: '#C4922A', brand: 'Generic' },
    { name: 'Naples Yellow', hex: '#E8C76B', brand: 'Generic' },
    { name: 'Raw Sienna', hex: '#A67B5B', brand: 'Generic' },
    // Greens
    { name: 'Phthalo Green', hex: '#1E5945', brand: 'Generic' },
    { name: 'Sap Green', hex: '#7B9070', brand: 'Generic' },
    { name: 'Viridian', hex: '#00746F', brand: 'Generic' },
    { name: 'Chromium Oxide', hex: '#4A6741', brand: 'Generic' },
    // Blues
    { name: 'Ultramarine', hex: '#1B3F8B', brand: 'Generic' },
    { name: 'Cobalt Blue', hex: '#5C8ACC', brand: 'Generic' },
    { name: 'Prussian Blue', hex: '#003153', brand: 'Generic' },
    { name: 'Phthalo Blue', hex: '#1A1A6C', brand: 'Generic' },
    { name: 'Cerulean', hex: '#33A1C9', brand: 'Generic' },
    // Purples
    { name: 'Dioxazine Purple', hex: '#7B3F9E', brand: 'Generic' },
    // Browns
    { name: 'Burnt Umber', hex: '#3C1810', brand: 'Generic' },
    { name: 'Raw Umber', hex: '#A69258', brand: 'Generic' },
]

export default function Library() {
    const [paints, setPaints] = useState([])
    const [search, setSearch] = useState('')
    const [showAdd, setShowAdd] = useState(false)
    const [editPaint, setEditPaint] = useState(null)
    const [colorSearch, setColorSearch] = useState('')
    const toast = useToast()

    useEffect(() => { load() }, [])

    async function load() {
        const data = await getAllPaints()
        setPaints(data.sort((a, b) => a.name.localeCompare(b.name)))
    }

    const filtered = paints.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.brand || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.code || '').toLowerCase().includes(search.toLowerCase())
    )

    const filteredStandard = STANDARD_COLORS.filter(c =>
        !colorSearch || c.name.toLowerCase().includes(colorSearch.toLowerCase())
    )

    async function handleDelete(id) {
        await deletePaint(id)
        await load()
        toast('Paint removed')
    }

    async function handleSave(data) {
        if (data.id) {
            await updatePaint(data)
        } else {
            await addPaint(data)
        }
        await load()
        setShowAdd(false)
        setEditPaint(null)
        toast(data.id ? 'Paint updated ✓' : 'Paint added to library ✓')
    }

    async function handleQuickAdd(color) {
        const already = paints.some(p => p.hex === color.hex)
        if (already) { toast(`${color.name} is already in your library`); return }
        const c = chroma(color.hex)
        await addPaint({ name: color.name, brand: color.brand, hex: color.hex, r: Math.round(c.get('rgb.r')), g: Math.round(c.get('rgb.g')), b: Math.round(c.get('rgb.b')) })
        await load()
        toast(`${color.name} added ✓`)
    }

    return (
        <div className="page">
            <div className="page-header">
                <div className="flex items-center justify-between">
                    <div>
                        <h1>🎨 My Library</h1>
                        <p>{paints.length} paint{paints.length !== 1 ? 's' : ''} · tap to edit</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowAdd(true)} id="add-paint-btn">
                        + Add
                    </button>
                </div>
            </div>

            <div className="search-wrapper">
                <span className="search-icon">🔍</span>
                <input
                    className="input search-input"
                    placeholder="Search name, brand, code…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    id="library-search"
                />
            </div>

            {/* Quick-add standard colors */}
            <div style={{ marginBottom: 16 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                    <div className="section-label">Quick Add Colors</div>
                </div>
                {/* Color search */}
                <div className="search-wrapper" style={{ marginBottom: 8 }}>
                    <span className="search-icon">🎨</span>
                    <input
                        className="input search-input"
                        placeholder="Search colors…"
                        value={colorSearch}
                        onChange={e => setColorSearch(e.target.value)}
                        id="color-search"
                    />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {filteredStandard.map(color => {
                        const added = paints.some(p => p.hex === color.hex)
                        return (
                            <button
                                key={color.hex}
                                onClick={() => handleQuickAdd(color)}
                                title={color.name}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 7,
                                    padding: '7px 12px 7px 8px',
                                    background: added ? 'rgba(124,106,247,0.12)' : 'var(--bg-card)',
                                    border: `1px solid ${added ? 'var(--accent)' : 'var(--border)'}`,
                                    borderRadius: 999, cursor: 'pointer', font: 'inherit',
                                    fontSize: 12, fontWeight: 600,
                                    color: added ? 'var(--accent)' : 'var(--text)',
                                    transition: 'all 0.2s',
                                    opacity: added ? 0.7 : 1,
                                }}
                            >
                                <div style={{ width: 18, height: 18, borderRadius: '50%', background: color.hex, border: '1.5px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
                                {color.name}
                                {added && <span style={{ fontSize: 11 }}>✓</span>}
                            </button>
                        )
                    })}
                    {filteredStandard.length === 0 && (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No colors found for "{colorSearch}"</div>
                    )}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">{paints.length === 0 ? '🎨' : '🔎'}</div>
                    <h3>{paints.length === 0 ? 'Your library is empty' : 'No results'}</h3>
                    <p>{paints.length === 0 ? 'Add your first acrylic paint by tapping "+ Add" above.' : 'Try a different search term.'}</p>
                </div>
            ) : (
                <div className="paint-grid">
                    {filtered.map(paint => (
                        <PaintCard
                            key={paint.id}
                            paint={paint}
                            onEdit={() => setEditPaint(paint)}
                            onDelete={() => handleDelete(paint.id)}
                        />
                    ))}
                </div>
            )}

            {(showAdd || editPaint) && (
                <AddPaintModal
                    initial={editPaint}
                    onSave={handleSave}
                    onClose={() => { setShowAdd(false); setEditPaint(null) }}
                />
            )}
        </div>
    )
}

function PaintCard({ paint, onEdit, onDelete }) {
    return (
        <div className="paint-card" onClick={onEdit} id={`paint-${paint.id}`}>
            <div className="paint-card-swatch" style={{ background: paint.hex }} />
            <div className="paint-card-body">
                <div className="paint-card-name truncate">{paint.name}</div>
                {paint.brand && <div className="paint-card-brand truncate">{paint.brand}</div>}
                <div className="paint-card-hex">{paint.hex}</div>
                {paint.code && <div className="paint-card-hex">{paint.code}</div>}
                <button
                    className="btn btn-danger mt-2"
                    style={{ width: '100%', padding: '6px', fontSize: 12 }}
                    onClick={e => { e.stopPropagation(); onDelete() }}
                    id={`delete-paint-${paint.id}`}
                >
                    Remove
                </button>
            </div>
        </div>
    )
}

function AddPaintModal({ initial, onSave, onClose }) {
    const [tab, setTab] = useState('manual')
    const [name, setName] = useState(initial?.name || '')
    const [brand, setBrand] = useState(initial?.brand || '')
    const [code, setCode] = useState(initial?.code || '')
    const [hex, setHex] = useState(initial?.hex || '#7c6af7')
    const [autoNameUsed, setAutoNameUsed] = useState(!initial?.name)
    const [cameraActive, setCameraActive] = useState(false)
    const [extractedPreview, setExtractedPreview] = useState(null)
    const [liveColor, setLiveColor] = useState(null)
    const videoRef = useRef(null)
    const streamRef = useRef(null)
    const intervalRef = useRef(null)
    const canvasRef = useRef(null)
    const toast = useToast()

    // Auto-name: update name when hex changes if user hasn't typed a custom name
    function handleHexChange(newHex) {
        setHex(newHex)
        if (autoNameUsed) {
            try {
                const { name: colorName } = nameColor(newHex)
                setName(colorName)
            } catch { }
        }
    }

    // On mount, auto-name if adding new paint
    useEffect(() => {
        if (!initial?.name) {
            const { name: colorName } = nameColor(hex)
            setName(colorName)
        }
    }, []) // eslint-disable-line

    // Parse hex to rgb
    function hexToRgb(h) {
        try { const c = chroma(h); return { r: c.get('rgb.r'), g: c.get('rgb.g'), b: c.get('rgb.b') } }
        catch { return { r: 124, g: 106, b: 247 } }
    }

    // Sample center pixel every 150 ms while camera is running
    useEffect(() => {
        if (!cameraActive) return
        intervalRef.current = setInterval(() => {
            const video = videoRef.current
            const canvas = canvasRef.current
            if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) return
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            ctx.drawImage(video, 0, 0)
            const cx = Math.floor(video.videoWidth / 2)
            const cy = Math.floor(video.videoHeight / 2)
            const d = ctx.getImageData(cx, cy, 1, 1).data
            setLiveColor('#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join(''))
        }, 150)
        return () => clearInterval(intervalRef.current)
    }, [cameraActive])

    // ── Camera helpers ──────────────────────────────────────────────────────
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            streamRef.current = stream
            if (videoRef.current) videoRef.current.srcObject = stream
            setCameraActive(true)
        } catch {
            toast('Camera not available')
        }
    }

    function stopCamera() {
        clearInterval(intervalRef.current)
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop())
            streamRef.current = null
        }
        setCameraActive(false)
        setLiveColor(null)
    }

    // Stop camera on unmount
    useEffect(() => () => stopCamera(), []) // eslint-disable-line

    function switchTab(newTab) {
        if (newTab !== 'camera') stopCamera()
        if (newTab === 'camera') startCamera()
        setTab(newTab)
    }

    function captureFrame() {
        if (!liveColor) return
        handleHexChange(liveColor)
        setExtractedPreview(liveColor)
        stopCamera()
        toast('Color captured! 🎨')
    }

    function handleRetake() {
        setExtractedPreview(null)
        startCamera()
    }

    function handleSave() {
        if (!name.trim()) { toast('Please enter a paint name'); return }
        let validHex = hex
        try { validHex = chroma(hex).hex() } catch { toast('Invalid color'); return }
        const { r, g, b } = hexToRgb(validHex)
        onSave({ ...(initial || {}), name: name.trim(), brand: brand.trim(), code: code.trim(), hex: validHex, r, g, b })
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
                <div className="modal-handle" />
                <div className="modal-title">{initial ? 'Edit Paint' : 'Add Paint'}</div>

                <div className="tab-pills" style={{ marginBottom: 16 }}>
                    <button className={`tab-pill ${tab === 'manual' ? 'active' : ''}`} onClick={() => switchTab('manual')}>Manual</button>
                    <button className={`tab-pill ${tab === 'camera' ? 'active' : ''}`} onClick={() => switchTab('camera')}>Camera</button>
                    <button className={`tab-pill ${tab === 'photo' ? 'active' : ''}`} onClick={() => switchTab('photo')}>Photo</button>
                </div>

                {tab === 'camera' && (
                    <div style={{ marginBottom: 16 }}>
                        {/* Hidden canvas used for pixel sampling */}
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                        {extractedPreview ? (
                            <div>
                                <div style={{ height: 120, borderRadius: 'var(--radius)', background: extractedPreview, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: contrastColor(extractedPreview) }}>
                                    {extractedPreview.toUpperCase()}
                                </div>
                                <button className="btn btn-ghost w-full" onClick={handleRetake}>🔄 Retake</button>
                            </div>
                        ) : (
                            <>
                                <div className="camera-wrapper">
                                    <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%' }} />
                                    {/* Center crosshair */}
                                    <div className="camera-crosshair" />
                                    {/* Live color preview — top right */}
                                    {liveColor && (
                                        <div style={{
                                            position: 'absolute', top: 12, right: 12,
                                            width: 44, height: 44, borderRadius: '50%',
                                            background: liveColor,
                                            border: '3px solid rgba(255,255,255,0.9)',
                                            boxShadow: '0 2px 16px rgba(0,0,0,0.6)',
                                        }} />
                                    )}
                                </div>
                                <button className="btn btn-primary w-full mt-3" onClick={captureFrame} disabled={!liveColor}>📸 Capture Color</button>
                            </>
                        )}
                    </div>
                )}

                {tab === 'photo' && (
                    <div style={{ marginBottom: 16 }}>
                        <PhotoColorPicker
                            pickedHex={extractedPreview}
                            onColorPicked={({ hex: pickedHex }) => {
                                handleHexChange(pickedHex)
                                setExtractedPreview(pickedHex)
                                toast('Color picked! 🎨')
                            }}
                        />
                    </div>
                )}

                {/* Color wheel picker — shown on manual tab, also below others as adjuster */}
                <div className="field">
                    <label className="label">Color</label>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                        <ColorWheelPicker hex={hex} onChange={handleHexChange} />
                    </div>
                </div>

                <div className="field">
                    <label className="label">Name * {autoNameUsed && <span style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 400 }}>(auto-named)</span>}</label>
                    <input
                        className="input"
                        value={name}
                        onChange={e => { setName(e.target.value); setAutoNameUsed(false) }}
                        placeholder="e.g. Titanium White"
                        id="paint-name-input"
                    />
                </div>
                <div className="field">
                    <label className="label">Brand</label>
                    <input className="input" value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Liquitex, Golden" id="paint-brand-input" />
                </div>
                <div className="field">
                    <label className="label">Product Code</label>
                    <input className="input" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. PW6, 590" id="paint-code-input" />
                </div>

                <div className="flex gap-3 mt-3">
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} id="save-paint-btn">
                        {initial ? 'Save Changes' : 'Add to Library'}
                    </button>
                </div>
            </div>
        </div>
    )
}

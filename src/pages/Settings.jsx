import { useState, useEffect } from 'react'
import { getAllPaints } from '../db/db.js'
import { importDB } from '../db/db.js'
import { downloadJSON, downloadCSV } from '../db/export.js'
import { useToast } from '../components/Toast.jsx'

export default function Settings() {
    const [paints, setPaints] = useState([])
    const toast = useToast()

    useEffect(() => { getAllPaints().then(setPaints) }, [])

    async function handleExportJSON() {
        try {
            await downloadJSON()
            toast('Export ready ✓')
        } catch { toast('Export failed') }
    }

    async function handleExportCSV() {
        try {
            await downloadCSV(paints)
            toast('CSV download started ✓')
        } catch { toast('Export failed') }
    }

    async function handleImport(e) {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const text = await file.text()
            const data = JSON.parse(text)
            await importDB(data)
            const updated = await getAllPaints()
            setPaints(updated)
            toast(`Imported ${data.paints?.length || 0} paints, ${data.palettes?.length || 0} palettes ✓`)
        } catch {
            toast('Import failed — invalid file')
        }
        e.target.value = ''
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1>⚙️ Settings</h1>
                <p>Manage your data and app preferences</p>
            </div>

            {/* Stats */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ marginBottom: 12 }}>Library Summary</div>
                <div className="flex" style={{ gap: 12 }}>
                    <StatBadge value={paints.length} label="Paints" color="var(--accent)" />
                </div>
            </div>

            {/* Export */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ marginBottom: 4 }}>Export</div>
                <div className="text-sm text-muted" style={{ marginBottom: 14, lineHeight: 1.5 }}>
                    Export your paint library and palettes. On iPhone/Android the native share sheet will open — choose "Save to Files" to store it locally.
                </div>
                <div className="flex gap-3">
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleExportJSON} id="export-json-btn">
                        📦 Export JSON
                    </button>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={handleExportCSV} id="export-csv-btn">
                        📄 Export CSV
                    </button>
                </div>
            </div>

            {/* Import */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ marginBottom: 4 }}>Import</div>
                <div className="text-sm text-muted" style={{ marginBottom: 14, lineHeight: 1.5 }}>
                    Import a previously exported JSON file to restore or merge your data. Existing entries will be kept.
                </div>
                <label className="btn btn-ghost w-full" style={{ cursor: 'pointer' }} id="import-btn">
                    📂 Choose JSON File
                    <input type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleImport} />
                </label>
            </div>

            {/* PWA install hint */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ marginBottom: 4 }}>Install App</div>
                <div className="text-sm text-muted" style={{ lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--text)' }}>Android:</strong> Tap the menu (⋮) → "Add to Home Screen"<br />
                    <strong style={{ color: 'var(--text)' }}>iPhone:</strong> Tap Share (□↑) → "Add to Home Screen"<br />
                    The app then works fully offline.
                </div>
            </div>

            {/* About */}
            <div className="card" style={{ opacity: 0.7 }}>
                <div className="section-label" style={{ marginBottom: 6 }}>About</div>
                <div className="text-sm text-muted" style={{ lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--text)' }}>Acryl Mixer</strong> v1.0<br />
                    All data stored locally on your device.<br />
                    Color harmony powered by chroma-js.<br />
                    Fully vibecoded 🤖<br />
                    <a href="https://github.com/lkuebler/acryl-mixer" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                        github.com/lkuebler/acryl-mixer
                    </a>
                </div>
            </div>
        </div>
    )
}

function StatBadge({ value, label, color }) {
    return (
        <div style={{
            flex: 1,
            background: 'var(--bg-card2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px 16px',
            textAlign: 'center'
        }}>
            <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
            <div className="text-xs text-muted" style={{ marginTop: 2 }}>{label}</div>
        </div>
    )
}

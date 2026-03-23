import { useState, useEffect } from 'react'
import { getAllPaints, getAllPalettes } from '../db/db.js'
import { clearAllData } from '../db/db.js'
import { importDB } from '../db/db.js'
import { downloadJSON, downloadCSV } from '../db/export.js'
import { useToast } from '../components/Toast.jsx'
import { resetOnboarding } from '../components/Onboarding.jsx'

export default function Settings({ onShowOnboarding, theme, onToggleTheme }) {
    const [paints, setPaints] = useState([])
    const [palettes, setPalettes] = useState([])
    const [deleteStage, setDeleteStage] = useState(0) // 0=idle 1=confirm 2=deleting
    const toast = useToast()

    useEffect(() => {
        getAllPaints().then(setPaints)
        getAllPalettes().then(setPalettes)
    }, [])

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
            const [p, pal] = await Promise.all([getAllPaints(), getAllPalettes()])
            setPaints(p); setPalettes(pal)
            toast(`Imported ${data.paints?.length || 0} paints, ${data.palettes?.length || 0} palettes ✓`)
        } catch {
            toast('Import failed — invalid file')
        }
        e.target.value = ''
    }

    async function handleDeleteAll() {
        if (deleteStage === 0) {
            setDeleteStage(1)
            // auto-reset after 4 s if user doesn't confirm
            setTimeout(() => setDeleteStage(s => s === 1 ? 0 : s), 4000)
            return
        }
        if (deleteStage === 1) {
            setDeleteStage(2)
            await clearAllData()
            setPaints([]); setPalettes([])
            setDeleteStage(0)
            toast('All data deleted')
        }
    }

    function handleShowOnboarding() {
        resetOnboarding()
        onShowOnboarding?.()
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
                    <StatBadge value={palettes.length} label="Palettes" color="var(--accent2)" />
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

            {/* Appearance */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ marginBottom: 4 }}>Appearance</div>
                <div className="flex items-center justify-between">
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                            {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                        </div>
                        <div className="text-sm text-muted" style={{ marginTop: 2 }}>
                            Switch between light and dark theme
                        </div>
                    </div>
                    <button
                        className="theme-toggle"
                        onClick={onToggleTheme}
                        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                        id="theme-toggle-btn"
                    >
                        <span className="theme-toggle-thumb" />
                    </button>
                </div>
            </div>

            {/* App */}
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ marginBottom: 4 }}>App</div>
                <div className="text-sm text-muted" style={{ marginBottom: 14, lineHeight: 1.5 }}>
                    Replay the onboarding tour shown on first launch.
                </div>
                <button className="btn btn-ghost w-full" onClick={handleShowOnboarding} id="show-onboarding-btn">
                    🗺️ Show App Tour
                </button>
            </div>

            {/* Danger zone */}
            <div className="card" style={{ marginBottom: 16, border: '1px solid rgba(248,124,106,0.25)' }}>
                <div className="section-label" style={{ marginBottom: 4, color: 'var(--accent2)' }}>Danger Zone</div>
                <div className="text-sm text-muted" style={{ marginBottom: 14, lineHeight: 1.5 }}>
                    Permanently delete all paints and palettes from this device. This cannot be undone.
                </div>

                {deleteStage === 0 && (
                    <button
                        className="btn btn-danger w-full"
                        onClick={handleDeleteAll}
                        id="delete-all-btn"
                    >
                        🗑️ Delete All Data
                    </button>
                )}

                {deleteStage === 1 && (
                    <div>
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: 10,
                            background: 'rgba(248,124,106,0.08)',
                            border: '1px solid rgba(248,124,106,0.3)',
                            fontSize: 13,
                            color: 'var(--accent2)',
                            fontWeight: 500,
                            marginBottom: 10,
                            textAlign: 'center',
                            lineHeight: 1.5,
                        }}>
                            ⚠️ This will permanently delete <strong>{paints.length} paint{paints.length !== 1 ? 's' : ''}</strong> and <strong>{palettes.length} palette{palettes.length !== 1 ? 's' : ''}</strong>.<br />
                            Tap the button again to confirm.
                        </div>
                        <div className="flex gap-3">
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteStage(0)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                style={{ flex: 2 }}
                                onClick={handleDeleteAll}
                                id="confirm-delete-btn"
                            >
                                🗑️ Yes, Delete Everything
                            </button>
                        </div>
                    </div>
                )}

                {deleteStage === 2 && (
                    <button className="btn btn-danger w-full" disabled>
                        ⏳ Deleting…
                    </button>
                )}
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
                    <strong style={{ color: 'var(--text)' }}>Acryl Mixer</strong> v1.1<br />
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

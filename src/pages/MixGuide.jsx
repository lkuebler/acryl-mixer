import { useState, useEffect } from 'react'
import { getAllPaints } from '../db/db.js'
import { getMixingGuide } from '../utils/colorMix.js'
import { contrastColor } from '../utils/colorHarmony.js'
import { useToast } from '../components/Toast.jsx'
import chroma from 'chroma-js'

export default function MixGuide() {
    const [paints, setPaints] = useState([])
    const [targetHex, setTargetHex] = useState('#e87c4a')
    const [guide, setGuide] = useState(null)
    const [loading, setLoading] = useState(false)
    const toast = useToast()

    useEffect(() => { getAllPaints().then(setPaints) }, [])

    function compute() {
        if (paints.length === 0) { toast('Add paints to your library first'); return }
        setLoading(true)
        setTimeout(() => {
            try {
                const result = getMixingGuide(targetHex, paints)
                setGuide(result)
            } catch (e) {
                toast('Could not compute mixing guide')
            }
            setLoading(false)
        }, 100)
    }

    const accuracyColor = guide
        ? guide.accuracy >= 80 ? '#4ade80'
            : guide.accuracy >= 50 ? '#facc15'
                : '#f87c6a'
        : 'var(--accent)'

    return (
        <div className="page">
            <div className="page-header">
                <h1>🧪 Mix Guide</h1>
                <p>Find how to mix a target color from your library</p>
            </div>

            {paints.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🎨</div>
                    <h3>Library is empty</h3>
                    <p>Add acrylic paints to your library first, then come back here to get mixing advice.</p>
                </div>
            ) : (
                <>
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="section-label" style={{ marginBottom: 12 }}>Target Color</div>
                        <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
                            <input type="color" value={targetHex} onChange={e => setTargetHex(e.target.value)} id="target-color-picker" />
                            <input
                                className="input"
                                value={targetHex}
                                onChange={e => setTargetHex(e.target.value)}
                                style={{ fontFamily: 'monospace' }}
                                id="target-hex-input"
                            />
                        </div>
                        <div style={{
                            height: 64,
                            borderRadius: 'var(--radius-sm)',
                            background: targetHex,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: 600,
                            color: contrastColor(targetHex)
                        }}>
                            {targetHex}
                        </div>
                    </div>

                    <div className="section-label" style={{ marginBottom: 8 }}>Or pick from library</div>
                    <div className="flex" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                        {paints.map(p => (
                            <button
                                key={p.id}
                                className="swatch"
                                style={{ background: p.hex, cursor: 'pointer', border: targetHex === p.hex ? '2px solid var(--accent)' : undefined }}
                                title={p.name}
                                onClick={() => setTargetHex(p.hex)}
                            />
                        ))}
                    </div>

                    <button
                        className="btn btn-primary w-full"
                        style={{ marginBottom: 24 }}
                        onClick={compute}
                        disabled={loading}
                        id="compute-mix-btn"
                    >
                        {loading ? '⏳ Computing…' : '🧪 Compute Mix'}
                    </button>

                    {guide && (
                        <div className="card">
                            <div className="section-label" style={{ marginBottom: 16 }}>Mixing Recipe</div>

                            <div className="flex items-center gap-4" style={{ marginBottom: 20 }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-sm)', background: guide.target, border: '2px solid var(--border)' }} />
                                    <div className="text-xs text-muted mt-2">Target</div>
                                </div>
                                <div className="text-muted" style={{ fontSize: 20 }}>→</div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-sm)', background: guide.resultHex, border: '2px solid var(--border)' }} />
                                    <div className="text-xs text-muted mt-2">Result</div>
                                </div>
                                <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
                                    <div
                                        className="accuracy-ring"
                                        style={{ borderColor: accuracyColor, color: accuracyColor }}
                                    >
                                        {guide.accuracy}%
                                    </div>
                                    <div className="text-xs text-muted mt-2">Match</div>
                                </div>
                            </div>

                            {/* Ratio bar */}
                            <div className="ratio-bar" style={{ marginBottom: 16 }}>
                                {guide.steps.map((step, i) => (
                                    <div
                                        key={i}
                                        className="ratio-segment"
                                        style={{ width: `${step.ratio}%`, background: step.paint.hex }}
                                        title={`${step.paint.name} ${step.ratio}%`}
                                    />
                                ))}
                            </div>

                            {/* Step-by-step instructions */}
                            <div className="section-label" style={{ marginBottom: 12 }}>Instructions</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {guide.steps
                                    .sort((a, b) => b.ratio - a.ratio)
                                    .map((step, i) => (
                                        <div key={i} className="flex items-center gap-3" style={{ padding: '12px 14px', background: 'var(--bg-card2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                            <div style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '50%',
                                                background: 'var(--accent)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                fontSize: 13,
                                                fontWeight: 700,
                                                color: '#fff'
                                            }}>
                                                {i + 1}
                                            </div>
                                            <div className="swatch swatch-sm flex-shrink-0" style={{ background: step.paint.hex }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 14, fontWeight: 600 }}>{step.paint.name}</div>
                                                {step.paint.brand && <div className="text-xs text-muted">{step.paint.brand}</div>}
                                            </div>
                                            <div style={{
                                                background: 'var(--accent)',
                                                color: '#fff',
                                                borderRadius: 'var(--radius-sm)',
                                                padding: '4px 10px',
                                                fontSize: 14,
                                                fontWeight: 700,
                                                flexShrink: 0
                                            }}>
                                                {step.ratio}%
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>

                            {guide.accuracy < 60 && (
                                <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(248,124,106,0.1)', border: '1px solid rgba(248,124,106,0.2)', borderRadius: 'var(--radius-sm)' }}>
                                    <div style={{ fontSize: 13, color: 'var(--accent2)', fontWeight: 500 }}>
                                        ⚠ Low match — add more paints to your library for better results.
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

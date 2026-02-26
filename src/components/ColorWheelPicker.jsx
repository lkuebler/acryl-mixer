import { useState, useRef, useEffect, useCallback } from 'react'
import chroma from 'chroma-js'

/**
 * ColorWheelPicker — a beautiful HSL color wheel with saturation + lightness sliders.
 * Props:
 *   hex: string        – current color as hex
 *   onChange(hex)      – called whenever user picks a new color
 */
export default function ColorWheelPicker({ hex = '#7c6af7', onChange }) {
    const [h, setH] = useState(0)
    const [s, setS] = useState(0.7)
    const [l, setL] = useState(0.5)
    const [hexInput, setHexInput] = useState(hex)
    const wheelRef = useRef(null)
    const draggingWheel = useRef(false)
    const SIZE = 200

    // Sync from prop (when external hex changes)
    useEffect(() => {
        try {
            const c = chroma(hex)
            const [hh, ss, ll] = c.hsl()
            setH(isNaN(hh) ? 0 : hh)
            setS(isNaN(ss) ? 0 : ss)
            setL(isNaN(ll) ? 0.5 : ll)
            setHexInput(c.hex())
        } catch { }
    }, [hex])

    const buildHex = useCallback((_h, _s, _l) => {
        try { return chroma.hsl(_h, Math.max(0, Math.min(1, _s)), Math.max(0, Math.min(1, _l))).hex() }
        catch { return '#000000' }
    }, [])

    function emit(newH, newS, newL) {
        const result = buildHex(newH, newS, newL)
        setHexInput(result)
        onChange?.(result)
    }

    // ── Wheel interaction ──────────────────────────────────────────────────────
    function getHueFromPointer(e) {
        const rect = wheelRef.current.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY
        const angle = ((Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI + 360) % 360
        return angle
    }

    function onWheelPointerDown(e) {
        e.preventDefault()
        draggingWheel.current = true
        const newH = getHueFromPointer(e)
        setH(newH); emit(newH, s, l)
    }
    function onWheelPointerMove(e) {
        if (!draggingWheel.current) return
        e.preventDefault()
        const newH = getHueFromPointer(e)
        setH(newH); emit(newH, s, l)
    }
    function onWheelPointerUp() { draggingWheel.current = false }

    // ── Thumb position on wheel ───────────────────────────────────────────────
    const thumbR = SIZE / 2 - 14
    const thumbAngleRad = (h * Math.PI) / 180
    const thumbX = SIZE / 2 + thumbR * Math.cos(thumbAngleRad)
    const thumbY = SIZE / 2 + thumbR * Math.sin(thumbAngleRad)

    // ── Hex input ────────────────────────────────────────────────────────────
    function onHexChange(v) {
        setHexInput(v)
        try {
            const c = chroma(v)
            const [hh, ss, ll] = c.hsl()
            const newH = isNaN(hh) ? 0 : hh
            const newS = isNaN(ss) ? 0 : ss
            const newL = isNaN(ll) ? 0.5 : ll
            setH(newH); setS(newS); setL(newL)
            onChange?.(c.hex())
        } catch { }
    }

    const currentHex = buildHex(h, s, l)
    const pureHue = buildHex(h, 1, 0.5)
    // Gradients for sliders
    const satGradient = `linear-gradient(to right, ${buildHex(h, 0, l)}, ${buildHex(h, 1, l)})`
    const litGradient = `linear-gradient(to right, ${buildHex(h, s, 0)}, ${buildHex(h, s, 0.5)}, ${buildHex(h, s, 1)})`

    return (
        <div className="color-wheel-picker">
            {/* ── Hue ring ────────────────────────────────── */}
            <div
                ref={wheelRef}
                style={{
                    width: SIZE,
                    height: SIZE,
                    borderRadius: '50%',
                    background: `conic-gradient(
            hsl(0,100%,50%), hsl(30,100%,50%), hsl(60,100%,50%),
            hsl(90,100%,50%), hsl(120,100%,50%), hsl(150,100%,50%),
            hsl(180,100%,50%), hsl(210,100%,50%), hsl(240,100%,50%),
            hsl(270,100%,50%), hsl(300,100%,50%), hsl(330,100%,50%),
            hsl(360,100%,50%)
          )`,
                    cursor: 'crosshair',
                    position: 'relative',
                    touchAction: 'none',
                    userSelect: 'none',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                    flexShrink: 0,
                }}
                onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); onWheelPointerDown(e) }}
                onPointerMove={onWheelPointerMove}
                onPointerUp={onWheelPointerUp}
            >
                {/* Inner mask → makes it a ring */}
                <div style={{
                    position: 'absolute',
                    top: 24, left: 24,
                    width: SIZE - 48, height: SIZE - 48,
                    borderRadius: '50%',
                    background: 'var(--bg-card)',
                    pointerEvents: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    {/* Center swatch */}
                    <div style={{
                        width: SIZE - 96, height: SIZE - 96,
                        borderRadius: '50%',
                        background: currentHex,
                        border: '3px solid var(--bg-card)',
                        boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
                        transition: 'background 0.15s',
                    }} />
                </div>
                {/* Hue thumb */}
                <div style={{
                    position: 'absolute',
                    left: thumbX - 11,
                    top: thumbY - 11,
                    width: 22, height: 22,
                    borderRadius: '50%',
                    background: pureHue,
                    border: '3px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
                    pointerEvents: 'none',
                    transition: 'background 0.1s',
                }} />
            </div>

            {/* ── Sliders ───────────────────────────────────── */}
            <div style={{ width: '100%', maxWidth: 240, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Saturation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', width: 12, flexShrink: 0 }}>S</span>
                    <div style={{ flex: 1, position: 'relative', height: 14, borderRadius: 999, background: satGradient, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)' }}>
                        <input
                            type="range" min={0} max={100} step={1} value={Math.round(s * 100)}
                            onChange={e => { const v = Number(e.target.value) / 100; setS(v); emit(h, v, l) }}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
                        />
                        {/* Visible thumb */}
                        <div style={{
                            position: 'absolute',
                            left: `calc(${s * 100}% - 10px)`,
                            top: '50%', transform: 'translateY(-50%)',
                            width: 20, height: 20, borderRadius: '50%',
                            background: '#fff',
                            border: '2px solid rgba(0,0,0,0.2)',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                            pointerEvents: 'none',
                            transition: 'left 0.05s',
                        }} />
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', width: 28, textAlign: 'right', flexShrink: 0 }}>{Math.round(s * 100)}%</span>
                </div>

                {/* Lightness */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', width: 12, flexShrink: 0 }}>L</span>
                    <div style={{ flex: 1, position: 'relative', height: 14, borderRadius: 999, background: litGradient, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)' }}>
                        <input
                            type="range" min={0} max={100} step={1} value={Math.round(l * 100)}
                            onChange={e => { const v = Number(e.target.value) / 100; setL(v); emit(h, s, v) }}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
                        />
                        {/* Visible thumb */}
                        <div style={{
                            position: 'absolute',
                            left: `calc(${l * 100}% - 10px)`,
                            top: '50%', transform: 'translateY(-50%)',
                            width: 20, height: 20, borderRadius: '50%',
                            background: '#fff',
                            border: '2px solid rgba(0,0,0,0.2)',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                            pointerEvents: 'none',
                            transition: 'left 0.05s',
                        }} />
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', width: 28, textAlign: 'right', flexShrink: 0 }}>{Math.round(l * 100)}%</span>
                </div>

                {/* Hex row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: 7,
                        background: currentHex,
                        border: '2px solid var(--border)',
                        flexShrink: 0,
                        transition: 'background 0.15s',
                    }} />
                    <input
                        className="input"
                        value={hexInput}
                        onChange={e => onHexChange(e.target.value)}
                        placeholder="#rrggbb"
                        style={{ fontFamily: 'monospace', flex: 1, padding: '8px 10px', fontSize: 13 }}
                        id="color-wheel-hex-input"
                    />
                </div>
            </div>
        </div>
    )
}

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'acryl-mixer-onboarding-done'

const SLIDES = [
    {
        emoji: '🎨',
        title: 'Welcome to Acryl Mixer',
        body: 'Your personal acrylic paint companion — library, palettes, and mixing guides, all stored privately on your device.',
    },
    {
        emoji: '📚',
        title: 'Build Your Library',
        body: 'Add your paints manually, snap them with the camera, or pick colors from a photo. Each paint is auto-named and searchable.',
    },
    {
        emoji: '✨',
        title: 'Generate Palettes',
        body: 'Create harmonious color combinations via color theory, pick randomly, mix two library colors, or get an AI-generated palette from Huemint.',
    },
    {
        emoji: '🧪',
        title: 'Mix Guide',
        body: 'Choose a target color and the app computes which paints from your library to mix and in what ratio. Use "Fix My Mix" to correct a color mid-session.',
    },
]

/**
 * Onboarding modal — shown on first visit, dismissable, re-triggerable from Settings.
 * Uses localStorage key 'acryl-mixer-onboarding-done' to track completion.
 */
export default function Onboarding({ forceOpen = false, onClose }) {
    const [visible, setVisible] = useState(false)
    const [asked, setAsked] = useState(false)  // whether we showed the "want a tour?" prompt
    const [slide, setSlide] = useState(0)

    useEffect(() => {
        if (forceOpen) {
            setVisible(true)
            setAsked(true)
            setSlide(0)
            return
        }
        const done = localStorage.getItem(STORAGE_KEY)
        if (!done) {
            setVisible(true)
            setAsked(false)
        }
    }, [forceOpen])

    function dismiss() {
        localStorage.setItem(STORAGE_KEY, '1')
        setVisible(false)
        onClose?.()
    }

    function startTour() {
        setAsked(true)
        setSlide(0)
    }

    function nextSlide() {
        if (slide < SLIDES.length - 1) {
            setSlide(slide + 1)
        } else {
            dismiss()
        }
    }

    if (!visible) return null

    const current = SLIDES[slide]

    return (
        <div
            className="modal-overlay"
            onClick={e => { if (e.target === e.currentTarget) dismiss() }}
            style={{ alignItems: 'center', padding: '0 20px' }}
        >
            <div
                className="modal-sheet"
                style={{
                    borderRadius: 24,
                    maxWidth: 420,
                    width: '100%',
                    padding: '28px 24px 32px',
                    animation: 'slideUp 0.35s cubic-bezier(0.4,0,0.2,1)',
                    position: 'relative',
                }}
                onClick={e => e.stopPropagation()}
            >
                {!asked ? (
                    /* ── "Want a tour?" prompt ─────────────────────────────── */
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 52, marginBottom: 16 }}>🎨</div>
                        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, letterSpacing: -0.3 }}>
                            Welcome to Acryl Mixer!
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 28 }}>
                            Would you like a quick tour of the app's features?
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                className="btn btn-ghost"
                                style={{ flex: 1 }}
                                onClick={dismiss}
                            >
                                Skip
                            </button>
                            <button
                                className="btn btn-primary"
                                style={{ flex: 2 }}
                                onClick={startTour}
                            >
                                Yes, show me around!
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── Slide content ─────────────────────────────────────── */
                    <div style={{ textAlign: 'center' }}>
                        {/* Progress dots */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 28 }}>
                            {SLIDES.map((_, i) => (
                                <div
                                    key={i}
                                    onClick={() => setSlide(i)}
                                    style={{
                                        width: i === slide ? 22 : 7,
                                        height: 7,
                                        borderRadius: 999,
                                        background: i === slide ? 'var(--accent)' : 'var(--border)',
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer',
                                    }}
                                />
                            ))}
                        </div>

                        <div style={{
                            fontSize: 56,
                            marginBottom: 18,
                            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
                            animation: 'emojiPop 0.35s cubic-bezier(0.4,0,0.2,1)',
                        }}>
                            {current.emoji}
                        </div>

                        <div style={{
                            fontSize: 20, fontWeight: 700, marginBottom: 12, letterSpacing: -0.3,
                            animation: 'fadeSlide 0.3s ease',
                        }}>
                            {current.title}
                        </div>

                        <div style={{
                            fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.65,
                            marginBottom: 32, minHeight: 64,
                            animation: 'fadeSlide 0.3s ease',
                        }}>
                            {current.body}
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={dismiss}>
                                Skip
                            </button>
                            <button className="btn btn-primary" style={{ flex: 2 }} onClick={nextSlide}>
                                {slide < SLIDES.length - 1 ? 'Next →' : '🚀 Get Started'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

/** Returns true if the user hasn't completed onboarding yet */
export function needsOnboarding() {
    return !localStorage.getItem(STORAGE_KEY)
}

/** Resets the onboarding flag (for Settings re-trigger) */
export function resetOnboarding() {
    localStorage.removeItem(STORAGE_KEY)
}

import { useState } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav.jsx'
import { ToastProvider } from './components/Toast.jsx'
import Onboarding from './components/Onboarding.jsx'
import Library from './pages/Library.jsx'
import PaletteGen from './pages/PaletteGen.jsx'
import MixGuide from './pages/MixGuide.jsx'
import Settings from './pages/Settings.jsx'
import { useTheme } from './hooks/useTheme.js'

export default function App() {
    const [showOnboarding, setShowOnboarding] = useState(false)
    const { theme, toggleTheme } = useTheme()

    return (
        <ToastProvider>
            <HashRouter>
                <Routes>
                    <Route path="/" element={<Library />} />
                    <Route path="/palettes" element={<PaletteGen />} />
                    <Route path="/mix" element={<MixGuide />} />
                    <Route path="/settings" element={<Settings onShowOnboarding={() => setShowOnboarding(true)} theme={theme} onToggleTheme={toggleTheme} />} />
                </Routes>
                <BottomNav />
            </HashRouter>
            {/* Onboarding — auto-shown on first visit, or triggered from Settings */}
            <Onboarding
                forceOpen={showOnboarding}
                onClose={() => setShowOnboarding(false)}
            />
        </ToastProvider>
    )
}

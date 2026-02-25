import { HashRouter, Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav.jsx'
import { ToastProvider } from './components/Toast.jsx'
import Library from './pages/Library.jsx'
import PaletteGen from './pages/PaletteGen.jsx'
import MixGuide from './pages/MixGuide.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
    return (
        <ToastProvider>
            <HashRouter>
                <Routes>
                    <Route path="/" element={<Library />} />
                    <Route path="/palettes" element={<PaletteGen />} />
                    <Route path="/mix" element={<MixGuide />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
                <BottomNav />
            </HashRouter>
        </ToastProvider>
    )
}

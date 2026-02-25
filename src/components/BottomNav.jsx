import { useLocation, useNavigate } from 'react-router-dom'

const TABS = [
    { path: '/', icon: '🎨', label: 'Library' },
    { path: '/palettes', icon: '✨', label: 'Palettes' },
    { path: '/mix', icon: '🧪', label: 'Mix' },
    { path: '/settings', icon: '⚙️', label: 'Settings' },
]

export default function BottomNav() {
    const location = useLocation()
    const navigate = useNavigate()

    return (
        <nav className="bottom-nav">
            {TABS.map(tab => {
                const active = location.pathname === tab.path
                return (
                    <button
                        key={tab.path}
                        className={`nav-item ${active ? 'active' : ''}`}
                        onClick={() => navigate(tab.path)}
                        id={`nav-${tab.label.toLowerCase()}`}
                    >
                        <span className="nav-icon">{tab.icon}</span>
                        <span className="nav-label">{tab.label}</span>
                    </button>
                )
            })}

            <style>{`
        .bottom-nav {
          display: flex;
          background: rgba(15,15,26,0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-bottom: var(--safe-bottom);
          height: calc(var(--nav-h) + var(--safe-bottom));
          flex-shrink: 0;
          z-index: 50;
        }
        .nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          border: none;
          background: transparent;
          cursor: pointer;
          padding: 8px 4px;
          border-radius: 0;
          font-family: inherit;
          transition: all 0.2s ease;
          position: relative;
        }
        .nav-item::after {
          content: '';
          position: absolute;
          top: 0;
          left: 25%;
          right: 25%;
          height: 2px;
          background: var(--accent);
          border-radius: 0 0 999px 999px;
          transform: scaleX(0);
          transition: transform 0.2s ease;
        }
        .nav-item.active::after { transform: scaleX(1); }
        .nav-icon {
          font-size: 20px;
          transition: transform 0.2s ease;
          line-height: 1;
        }
        .nav-item.active .nav-icon { transform: scale(1.15); }
        .nav-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-faint);
          transition: color 0.2s ease;
          letter-spacing: 0.3px;
        }
        .nav-item.active .nav-label { color: var(--accent); }
      `}</style>
        </nav>
    )
}

import { useState, useEffect, createContext, useContext } from 'react'

const ToastCtx = createContext(null)

export function useToast() {
    return useContext(ToastCtx)
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const toast = (message) => {
        const id = Date.now()
        setToasts(t => [...t, { id, message }])
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2600)
    }

    return (
        <ToastCtx.Provider value={toast}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className="toast">{t.message}</div>
                ))}
            </div>
        </ToastCtx.Provider>
    )
}

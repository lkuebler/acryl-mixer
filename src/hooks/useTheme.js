import { useState, useEffect } from 'react'

const STORAGE_KEY = 'acryl-theme'

export function useTheme() {
    const [theme, setTheme] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) return stored
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    })

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem(STORAGE_KEY, theme)
    }, [theme])

    function toggleTheme() {
        setTheme(t => t === 'dark' ? 'light' : 'dark')
    }

    return { theme, toggleTheme }
}

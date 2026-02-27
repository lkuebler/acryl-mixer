/**
 * huemint.js — AI palette generation via the Huemint public API.
 * https://huemint.com/
 *
 * The free API has no key requirement but may be rate-limited.
 * We fall back gracefully on any error.
 */

const ENDPOINT = 'https://huemint.com/api/color'
const TIMEOUT_MS = 12000

/**
 * Generate an AI palette using Huemint.
 * @param {number} count - number of colors (2–12)
 * @returns {Promise<string[]>} array of hex strings like ['#ff5733', ...]
 */
export async function fetchHuemintPalette(count = 5) {
    const n = Math.max(2, Math.min(12, count))

    // Build adjacency matrix: all pairs interconnected (value 55 = medium relationship)
    const adjacency = []
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            adjacency.push(i === j ? '0' : '55')
        }
    }

    const body = {
        mode: 'transformer',
        num_colors: n,
        temperature: 1.2,
        num_results: 1,
        adjacency: adjacency.join(' '),
        palette: Array(n).fill('-'),
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
        const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()
        const palette = data.results?.[0]?.palette

        if (!Array.isArray(palette) || palette.length === 0) {
            throw new Error('Empty palette response')
        }

        // Normalize: Huemint returns hex without '#' sometimes
        return palette.map(h => h.startsWith('#') ? h : `#${h}`)
    } finally {
        clearTimeout(timer)
    }
}

import chroma from 'chroma-js'

const HARMONY_MODES = {
    analogous: 'Analogous',
    complementary: 'Complementary',
    triadic: 'Triadic',
    'split-complementary': 'Split Complementary',
    tetradic: 'Tetradic',
    monochromatic: 'Monochromatic',
}

export { HARMONY_MODES }

/**
 * Generate a palette from a seed hex color.
 * @param {string} hex - seed color
 * @param {string} mode - harmony mode key
 * @param {number} count - number of colors (3–8)
 * @returns {string[]} array of hex colors
 */
export function generatePalette(hex, mode, count = 5) {
    const base = chroma(hex)
    const [h, s, l] = base.hsl()
    const hue = isNaN(h) ? 0 : h

    let colors = []

    switch (mode) {
        case 'analogous': {
            const step = 30 / (count - 1)
            for (let i = 0; i < count; i++) {
                colors.push(chroma.hsl((hue - 30 + i * step + 360) % 360, s, l))
            }
            break
        }
        case 'complementary': {
            const comp = (hue + 180) % 360
            colors = chroma.scale([
                chroma.hsl(hue, s, Math.max(l - 0.15, 0.1)),
                base,
                chroma.hsl(hue, s, Math.min(l + 0.15, 0.95)),
                chroma.hsl(comp, s, Math.max(l - 0.1, 0.1)),
                chroma.hsl(comp, s, l),
            ]).mode('lab').colors(count)
            break
        }
        case 'triadic': {
            const h2 = (hue + 120) % 360
            const h3 = (hue + 240) % 360
            const thirds = [base, chroma.hsl(h2, s, l), chroma.hsl(h3, s, l)]
            colors = interpolate(thirds, count)
            break
        }
        case 'split-complementary': {
            const h2 = (hue + 150) % 360
            const h3 = (hue + 210) % 360
            const splits = [base, chroma.hsl(h2, s, l), chroma.hsl(h3, s, l)]
            colors = interpolate(splits, count)
            break
        }
        case 'tetradic': {
            const h2 = (hue + 90) % 360
            const h3 = (hue + 180) % 360
            const h4 = (hue + 270) % 360
            const tetrad = [base, chroma.hsl(h2, s, l), chroma.hsl(h3, s, l), chroma.hsl(h4, s, l)]
            colors = interpolate(tetrad, count)
            break
        }
        case 'monochromatic': {
            colors = chroma.scale([
                chroma.hsl(hue, s * 0.4, 0.15),
                chroma.hsl(hue, s * 0.7, 0.4),
                base,
                chroma.hsl(hue, s * 0.5, 0.8),
            ]).mode('lab').colors(count)
            break
        }
        default:
            colors = [base.hex()]
    }

    return colors.map(c => (typeof c === 'string' ? c : c.hex()))
}

function interpolate(chromaColors, count) {
    return chroma.scale(chromaColors).mode('lab').colors(count)
}

/**
 * Return a contrast color (white or near-black) for text on a given background.
 */
export function contrastColor(hex) {
    try {
        return chroma(hex).luminance() > 0.35 ? '#1a1a2e' : '#ffffff'
    } catch {
        return '#ffffff'
    }
}

/**
 * Compute CIELAB ΔE distance between two hex colors.
 */
export function deltaE(hex1, hex2) {
    try {
        return chroma.deltaE(hex1, hex2)
    } catch {
        return 999
    }
}

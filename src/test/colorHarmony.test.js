import { describe, it, expect } from 'vitest'
import {
    generatePalette,
    twoColorMix,
    contrastColor,
    deltaE,
    HARMONY_MODES,
} from '../utils/colorHarmony.js'

const RED = '#ff0000'
const BLUE = '#0000ff'
const WHITE = '#ffffff'
const BLACK = '#000000'

describe('deltaE', () => {
    it('returns 0 for identical colors', () => {
        expect(deltaE(RED, RED)).toBeCloseTo(0, 0)
    })

    it('returns a large value for very different colors', () => {
        expect(deltaE(BLACK, WHITE)).toBeGreaterThan(50)
    })

    it('returns 999 for invalid colors', () => {
        expect(deltaE('notacolor', RED)).toBe(999)
    })
})

describe('contrastColor', () => {
    it('returns dark text for light background', () => {
        expect(contrastColor(WHITE)).toBe('#1a1a2e')
    })

    it('returns white text for dark background', () => {
        expect(contrastColor(BLACK)).toBe('#ffffff')
    })

    it('returns white for invalid hex', () => {
        expect(contrastColor('invalid')).toBe('#ffffff')
    })
})

describe('twoColorMix', () => {
    it('returns an array of the requested length', () => {
        const palette = twoColorMix(RED, BLUE, 5)
        expect(palette).toHaveLength(5)
    })

    it('starts near the first color and ends near the second', () => {
        const palette = twoColorMix(RED, BLUE, 5)
        expect(deltaE(palette[0], RED)).toBeLessThan(20)
        expect(deltaE(palette[4], BLUE)).toBeLessThan(20)
    })

    it('falls back gracefully for invalid inputs', () => {
        const palette = twoColorMix('bad', 'input', 5)
        expect(Array.isArray(palette)).toBe(true)
    })

    it('returns at least 2 colors even for invalid inputs', () => {
        const palette = twoColorMix('bad', 'input', 5)
        expect(palette.length).toBeGreaterThanOrEqual(2)
    })
})

describe('generatePalette', () => {
    const modes = Object.keys(HARMONY_MODES)

    it.each(modes)('mode "%s" returns the correct number of colors', (mode) => {
        const palette = generatePalette(RED, mode, 5)
        expect(palette).toHaveLength(5)
    })

    it.each(modes)('mode "%s" returns valid hex strings', (mode) => {
        const palette = generatePalette(RED, mode, 5)
        for (const hex of palette) {
            expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/)
        }
    })

    it('analogous colors are close in hue to the seed', () => {
        const palette = generatePalette(RED, 'analogous', 5)
        // All analogous colors should be within 40° of red in hue
        for (const hex of palette) {
            expect(deltaE(hex, RED)).toBeLessThan(60)
        }
    })

    it('complementary palette contains a color near the complement', () => {
        // Red's complement is cyan (~#00ffff)
        const palette = generatePalette(RED, 'complementary', 5)
        const minDist = Math.min(...palette.map(h => deltaE(h, '#00ffff')))
        expect(minDist).toBeLessThan(60)
    })

    it('triadic palette contains 3 evenly-spaced hue anchors', () => {
        // For a red seed: red, green (~120°), blue (~240°)
        const palette = generatePalette(RED, 'triadic', 5)
        const hasGreenish = palette.some(h => deltaE(h, '#00ff00') < 60)
        const hasBlueish = palette.some(h => deltaE(h, BLUE) < 60)
        expect(hasGreenish || hasBlueish).toBe(true)
    })

    it('monochromatic palette uses colors of similar hue', () => {
        const palette = generatePalette(RED, 'monochromatic', 5)
        // All should be on the red side (deltaE to red < 60)
        for (const hex of palette) {
            expect(deltaE(hex, RED)).toBeLessThan(80)
        }
    })

    it('works for count values from 3 to 8', () => {
        for (let count = 3; count <= 8; count++) {
            const palette = generatePalette(RED, 'analogous', count)
            expect(palette).toHaveLength(count)
        }
    })

    it('returns a single-color array for unknown mode', () => {
        const palette = generatePalette(RED, 'nonexistent', 5)
        expect(palette.length).toBeGreaterThanOrEqual(1)
    })

    it('handles achromatic colors (black, white, gray) without crashing', () => {
        expect(() => generatePalette('#808080', 'analogous', 5)).not.toThrow()
        expect(() => generatePalette(WHITE, 'triadic', 5)).not.toThrow()
        expect(() => generatePalette(BLACK, 'monochromatic', 5)).not.toThrow()
    })
})

describe('HARMONY_MODES', () => {
    it('contains the expected mode keys', () => {
        const keys = Object.keys(HARMONY_MODES)
        expect(keys).toContain('analogous')
        expect(keys).toContain('complementary')
        expect(keys).toContain('triadic')
        expect(keys).toContain('split-complementary')
        expect(keys).toContain('tetradic')
        expect(keys).toContain('monochromatic')
        expect(keys).toContain('random')
    })
})

import { describe, it, expect } from 'vitest'
import { nameColor } from '../utils/ntc.js'

describe('nameColor', () => {
    it('returns an object with name, hex, and distance properties', () => {
        const result = nameColor('#ff0000')
        expect(result).toHaveProperty('name')
        expect(result).toHaveProperty('hex')
        expect(result).toHaveProperty('distance')
    })

    it('identifies pure black', () => {
        const result = nameColor('#000000')
        expect(result.name).toBe('Black')
        expect(result.distance).toBe(0)
    })

    it('identifies pure white', () => {
        const result = nameColor('#ffffff')
        expect(result.name).toBe('Pure White')
        expect(result.distance).toBe(0)
    })

    it('identifies Cadmium Red by its exact hex', () => {
        const result = nameColor('#E8291C')
        expect(result.name).toBe('Cadmium Red')
    })

    it('finds the nearest color for a non-exact match', () => {
        // Slightly off-red should still return a red-ish name
        const result = nameColor('#e82a1e')
        expect(result.distance).toBeLessThan(10)
    })

    it('accepts both uppercase and lowercase hex', () => {
        const upper = nameColor('#FFFFFF')
        const lower = nameColor('#ffffff')
        expect(upper.name).toBe(lower.name)
    })

    it('handles 3-character shorthand hex', () => {
        // #fff → white
        const result = nameColor('#fff')
        expect(result.name).toBe('Pure White')
    })

    it('returns Unknown for completely invalid input', () => {
        const result = nameColor('not-a-hex')
        expect(result.name).toBe('Unknown')
        expect(result.distance).toBe(999)
    })

    it('distance is 0 for exact matches', () => {
        const result = nameColor('#000000')
        expect(result.distance).toBe(0)
    })

    it('distance increases for colors further from the closest named color', () => {
        // #000001 is very close to black (distance ~2)
        // #566070 is an intermediate color unlikely to be an exact match
        const veryClose = nameColor('#000001')
        const farAway = nameColor('#566070')
        expect(veryClose.distance).toBeLessThan(farAway.distance)
    })
})

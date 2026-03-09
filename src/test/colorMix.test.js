import { describe, it, expect } from 'vitest'
import { getMixingGuide } from '../utils/colorMix.js'

// Minimal paint objects as stored in the library
const RED_PAINT = { id: 1, name: 'Cadmium Red', hex: '#E8291C' }
const BLUE_PAINT = { id: 2, name: 'Ultramarine', hex: '#003F87' }
const WHITE_PAINT = { id: 3, name: 'Titanium White', hex: '#F2F0EC' }
const YELLOW_PAINT = { id: 4, name: 'Cadmium Yellow', hex: '#FFD700' }

describe('getMixingGuide', () => {
    it('returns null when paints array is empty', () => {
        expect(getMixingGuide('#ff0000', [])).toBeNull()
    })

    it('returns null when paints is null/undefined', () => {
        expect(getMixingGuide('#ff0000', null)).toBeNull()
        expect(getMixingGuide('#ff0000', undefined)).toBeNull()
    })

    it('returns a 100% single-paint guide when only one paint is available', () => {
        const result = getMixingGuide('#E8291C', [RED_PAINT])
        expect(result).not.toBeNull()
        expect(result.steps).toHaveLength(1)
        expect(result.steps[0].ratio).toBe(100)
        expect(result.steps[0].paint.name).toBe('Cadmium Red')
    })

    it('result always has target, steps, resultHex, and accuracy fields', () => {
        const result = getMixingGuide('#800000', [RED_PAINT, BLUE_PAINT])
        expect(result).toHaveProperty('target')
        expect(result).toHaveProperty('steps')
        expect(result).toHaveProperty('resultHex')
        expect(result).toHaveProperty('accuracy')
    })

    it('accuracy is a number between 0 and 100', () => {
        const result = getMixingGuide('#8B4513', [RED_PAINT, BLUE_PAINT, WHITE_PAINT])
        expect(result.accuracy).toBeGreaterThanOrEqual(0)
        expect(result.accuracy).toBeLessThanOrEqual(100)
    })

    it('ratios in steps sum to 100', () => {
        const result = getMixingGuide('#8B4513', [RED_PAINT, BLUE_PAINT, WHITE_PAINT])
        const sum = result.steps.reduce((acc, s) => acc + s.ratio, 0)
        expect(sum).toBe(100)
    })

    it('resultHex is a valid hex color string', () => {
        const result = getMixingGuide('#8B4513', [RED_PAINT, BLUE_PAINT, WHITE_PAINT])
        expect(result.resultHex).toMatch(/^#[0-9a-fA-F]{6}$/)
    })

    it('target field echoes the input hex', () => {
        const target = '#8B4513'
        const result = getMixingGuide(target, [RED_PAINT, BLUE_PAINT])
        expect(result.target).toBe(target)
    })

    it('uses at most 3 paints in the mix steps', () => {
        const result = getMixingGuide('#8B4513', [RED_PAINT, BLUE_PAINT, WHITE_PAINT, YELLOW_PAINT])
        expect(result.steps.length).toBeLessThanOrEqual(3)
    })

    it('returns higher accuracy when target matches a library paint exactly', () => {
        const result = getMixingGuide(RED_PAINT.hex, [RED_PAINT, BLUE_PAINT, WHITE_PAINT])
        expect(result.accuracy).toBeGreaterThan(90)
    })

    it('uses two paints when two similar colors are available', () => {
        const result = getMixingGuide('#7B143E', [RED_PAINT, BLUE_PAINT])
        expect(result.steps.length).toBeGreaterThanOrEqual(2)
    })

    it('considers up to 3 paints when library has 3+', () => {
        const result = getMixingGuide('#A0522D', [RED_PAINT, BLUE_PAINT, WHITE_PAINT, YELLOW_PAINT])
        // Should produce a result (not crash) and have between 1-3 steps
        expect(result.steps.length).toBeGreaterThanOrEqual(1)
        expect(result.steps.length).toBeLessThanOrEqual(3)
    })

    it('each step has paint and ratio properties', () => {
        const result = getMixingGuide('#8B4513', [RED_PAINT, BLUE_PAINT, WHITE_PAINT])
        for (const step of result.steps) {
            expect(step).toHaveProperty('paint')
            expect(step).toHaveProperty('ratio')
            expect(typeof step.ratio).toBe('number')
        }
    })

    it('works with a large library without errors', () => {
        const paints = Array.from({ length: 20 }, (_, i) => ({
            id: i,
            name: `Paint ${i}`,
            hex: `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`,
        }))
        expect(() => getMixingGuide('#8B4513', paints)).not.toThrow()
    })
})

import chroma from 'chroma-js'
import { deltaE } from './colorHarmony.js'

/**
 * Given a target hex color and a library of paints,
 * return mixing instructions with ratios.
 *
 * Strategy: find the best 2–3 paints from the library that,
 * when mixed, approximate the target in LAB space.
 * For simplicity we use a greedy weighted-centroid approach.
 */
export function getMixingGuide(targetHex, paints) {
    if (!paints || paints.length === 0) return null

    // Sort paints by distance to target
    const sorted = paints
        .map(p => ({ ...p, dist: deltaE(targetHex, p.hex) }))
        .sort((a, b) => a.dist - b.dist)

    const best = sorted.slice(0, Math.min(3, sorted.length))

    if (best.length === 1) {
        return {
            target: targetHex,
            steps: [{ paint: best[0], ratio: 100 }],
            resultHex: best[0].hex,
            accuracy: 100 - Math.min(best[0].dist, 100),
        }
    }

    // Try two-paint mix: find the pair that minimises distance to target
    let bestResult = null

    for (let i = 0; i < best.length; i++) {
        for (let j = i + 1; j < best.length; j++) {
            for (let r = 10; r <= 90; r += 10) {
                const mix = chroma.mix(best[i].hex, best[j].hex, r / 100, 'lab').hex()
                const dist = deltaE(targetHex, mix)
                if (!bestResult || dist < bestResult.dist) {
                    bestResult = {
                        dist,
                        steps: [
                            { paint: best[i], ratio: r },
                            { paint: best[j], ratio: 100 - r },
                        ],
                        resultHex: mix,
                    }
                }
            }
        }
    }

    // Try three-paint mix if we have 3 candidates
    if (best.length >= 3) {
        for (let r1 = 10; r1 <= 80; r1 += 10) {
            for (let r2 = 10; r2 <= 80 - r1; r2 += 10) {
                const r3 = 100 - r1 - r2
                if (r3 <= 0) continue
                const mid = chroma.mix(best[0].hex, best[1].hex, r2 / (r1 + r2), 'lab')
                const mix = chroma.mix(mid.hex(), best[2].hex, r3 / 100, 'lab').hex()
                const dist = deltaE(targetHex, mix)
                if (dist < bestResult.dist) {
                    bestResult = {
                        dist,
                        steps: [
                            { paint: best[0], ratio: r1 },
                            { paint: best[1], ratio: r2 },
                            { paint: best[2], ratio: r3 },
                        ],
                        resultHex: mix,
                    }
                }
            }
        }
    }

    return {
        target: targetHex,
        steps: bestResult.steps,
        resultHex: bestResult.resultHex,
        accuracy: Math.max(0, Math.round(100 - bestResult.dist)),
    }
}

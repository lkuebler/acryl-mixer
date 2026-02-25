/**
 * Extract the dominant color from an ImageBitmap or HTMLImageElement
 * via the Canvas 2D API.
 * Returns { hex, r, g, b }.
 */
export async function extractColorFromBlob(blob) {
    const bitmap = await createImageBitmap(blob)
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0)

    // Sample a 10x10 region at the center
    const cx = Math.floor(bitmap.width / 2)
    const cy = Math.floor(bitmap.height / 2)
    const size = Math.min(10, bitmap.width, bitmap.height)
    const imgData = ctx.getImageData(cx - size / 2, cy - size / 2, size, size)

    let rSum = 0, gSum = 0, bSum = 0, count = 0
    for (let i = 0; i < imgData.data.length; i += 4) {
        rSum += imgData.data[i]
        gSum += imgData.data[i + 1]
        bSum += imgData.data[i + 2]
        count++
    }

    const r = Math.round(rSum / count)
    const g = Math.round(gSum / count)
    const b = Math.round(bSum / count)
    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')

    return { hex, r, g, b }
}

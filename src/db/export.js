import { exportDB } from '../db/db.js'

export async function downloadJSON() {
    const data = await exportDB()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const filename = `acryl-mixer-${new Date().toISOString().split('T')[0]}.json`
    await shareOrDownload(blob, filename)
}

export async function downloadCSV(paints) {
    const header = 'name,brand,code,hex,r,g,b,tags,dateAdded\n'
    const rows = paints.map(p =>
        [p.name, p.brand, p.code, p.hex, p.r, p.g, p.b, (p.tags || []).join('|'), p.dateAdded].join(',')
    )
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' })
    const filename = `acryl-library-${new Date().toISOString().split('T')[0]}.csv`
    await shareOrDownload(blob, filename)
}

async function shareOrDownload(blob, filename) {
    const file = new File([blob], filename, { type: blob.type })
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: 'Acryl Mixer Export' })
            return
        } catch {
            // fall through to download
        }
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

import { openDB } from 'idb'

const DB_NAME = 'acryl-mixer-db'
const DB_VERSION = 1

let dbPromise = null

function getDB() {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('paints')) {
                    const paintsStore = db.createObjectStore('paints', { keyPath: 'id' })
                    paintsStore.createIndex('name', 'name', { unique: false })
                    paintsStore.createIndex('brand', 'brand', { unique: false })
                }
                if (!db.objectStoreNames.contains('palettes')) {
                    const palettesStore = db.createObjectStore('palettes', { keyPath: 'id' })
                    palettesStore.createIndex('name', 'name', { unique: false })
                }
            }
        })
    }
    return dbPromise
}

// ─── Paints ────────────────────────────────────────────────────────────────

export async function getAllPaints() {
    const db = await getDB()
    return db.getAll('paints')
}

export async function addPaint(paint) {
    const db = await getDB()
    const entry = { ...paint, id: paint.id || crypto.randomUUID(), dateAdded: new Date().toISOString() }
    await db.put('paints', entry)
    return entry
}

export async function updatePaint(paint) {
    const db = await getDB()
    await db.put('paints', paint)
}

export async function deletePaint(id) {
    const db = await getDB()
    await db.delete('paints', id)
}

// ─── Palettes ───────────────────────────────────────────────────────────────

export async function getAllPalettes() {
    const db = await getDB()
    return db.getAll('palettes')
}

export async function addPalette(palette) {
    const db = await getDB()
    const entry = { ...palette, id: palette.id || crypto.randomUUID(), dateAdded: new Date().toISOString() }
    await db.put('palettes', entry)
    return entry
}

export async function deletePalette(id) {
    const db = await getDB()
    await db.delete('palettes', id)
}

// ─── Full export ─────────────────────────────────────────────────────────────

export async function exportDB() {
    const [paints, palettes] = await Promise.all([getAllPaints(), getAllPalettes()])
    return { version: 1, exportedAt: new Date().toISOString(), paints, palettes }
}

export async function importDB(data) {
    const db = await getDB()
    const tx = db.transaction(['paints', 'palettes'], 'readwrite')
    for (const paint of data.paints || []) {
        await tx.objectStore('paints').put(paint)
    }
    for (const palette of data.palettes || []) {
        await tx.objectStore('palettes').put(palette)
    }
    await tx.done
}

// ─── Clear all data ──────────────────────────────────────────────────────────

export async function clearAllData() {
    const db = await getDB()
    const tx = db.transaction(['paints', 'palettes'], 'readwrite')
    await tx.objectStore('paints').clear()
    await tx.objectStore('palettes').clear()
    await tx.done
}


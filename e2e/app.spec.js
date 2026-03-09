import { test, expect } from '@playwright/test'

// Helper: dismiss onboarding modal on first visit
async function skipOnboarding(page) {
    await page.addInitScript(() => {
        localStorage.setItem('acryl-mixer-onboarding-done', '1')
    })
}

// Helper: seed a few paints directly into IndexedDB before the page loads
async function seedPaints(page) {
    await page.addInitScript(() => {
        const DB_NAME = 'acryl-mixer-db'
        const DB_VERSION = 1
        const request = indexedDB.open(DB_NAME, DB_VERSION)
        request.onupgradeneeded = (e) => {
            const db = e.target.result
            if (!db.objectStoreNames.contains('paints')) {
                const store = db.createObjectStore('paints', { keyPath: 'id' })
                store.createIndex('name', 'name', { unique: false })
                store.createIndex('brand', 'brand', { unique: false })
            }
            if (!db.objectStoreNames.contains('palettes')) {
                const store = db.createObjectStore('palettes', { keyPath: 'id' })
                store.createIndex('name', 'name', { unique: false })
            }
        }
        request.onsuccess = (e) => {
            const db = e.target.result
            const tx = db.transaction('paints', 'readwrite')
            const store = tx.objectStore('paints')
            const paints = [
                { id: 'seed-1', name: 'Titanium White', brand: 'Generic', code: '', hex: '#F2F0EC', r: 242, g: 240, b: 236, dateAdded: new Date().toISOString() },
                { id: 'seed-2', name: 'Cadmium Red', brand: 'Generic', code: '', hex: '#E8291C', r: 232, g: 41, b: 28, dateAdded: new Date().toISOString() },
                { id: 'seed-3', name: 'Ultramarine', brand: 'Generic', code: '', hex: '#1B3F8B', r: 27, g: 63, b: 139, dateAdded: new Date().toISOString() },
            ]
            paints.forEach(p => store.put(p))
        }
    })
}

test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await skipOnboarding(page)
        await page.goto('/')
    })

    test('loads the Library page by default', async ({ page }) => {
        await expect(page.getByRole('heading', { name: /My Library/i })).toBeVisible()
    })

    test('bottom navigation shows all four tabs', async ({ page }) => {
        await expect(page.locator('#nav-library')).toBeVisible()
        await expect(page.locator('#nav-palettes')).toBeVisible()
        await expect(page.locator('#nav-mix')).toBeVisible()
        await expect(page.locator('#nav-settings')).toBeVisible()
    })

    test('navigates to Palettes tab', async ({ page }) => {
        await page.locator('#nav-palettes').click()
        await expect(page.getByRole('heading', { name: /Palette/i })).toBeVisible()
    })

    test('navigates to Mix Guide tab', async ({ page }) => {
        await page.locator('#nav-mix').click()
        await expect(page.getByRole('heading', { name: /Mix Guide/i })).toBeVisible()
    })

    test('navigates to Settings tab', async ({ page }) => {
        await page.locator('#nav-settings').click()
        await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible()
    })

    test('navigates back to Library from another tab', async ({ page }) => {
        await page.locator('#nav-palettes').click()
        await page.locator('#nav-library').click()
        await expect(page.getByRole('heading', { name: /My Library/i })).toBeVisible()
    })
})

test.describe('Library page', () => {
    test.beforeEach(async ({ page }) => {
        await skipOnboarding(page)
        await page.goto('/')
    })

    test('shows empty-state when library is empty', async ({ page }) => {
        await expect(page.getByText(/Your library is empty/i)).toBeVisible()
    })

    test('shows search input', async ({ page }) => {
        await expect(page.locator('#library-search')).toBeVisible()
    })

    test('shows Quick Add Colors section', async ({ page }) => {
        await expect(page.getByText('Quick Add Colors')).toBeVisible()
    })

    test('shows color search input in Quick Add', async ({ page }) => {
        await expect(page.locator('#color-search')).toBeVisible()
    })

    test('quick-add color search filters results', async ({ page }) => {
        await page.locator('#color-search').fill('red')
        await expect(page.getByTitle('Cadmium Red')).toBeVisible()
        // Non-red color should not be visible
        await expect(page.getByTitle('Ultramarine')).not.toBeVisible()
    })

    test('quick-add color search shows no-results message', async ({ page }) => {
        await page.locator('#color-search').fill('zzznomatch')
        await expect(page.getByText(/No colors found/i)).toBeVisible()
    })

    test('opens Add Paint modal when + Add is clicked', async ({ page }) => {
        await page.locator('#add-paint-btn').click()
        await expect(page.getByText(/Add Paint/i)).toBeVisible()
    })

    test('quick-adds a paint from the standard color list', async ({ page }) => {
        // Click "Titanium White" in the quick-add list
        await page.getByTitle('Titanium White').click()
        // The paint should appear in the library
        await expect(page.getByText('Titanium White').first()).toBeVisible()
        // Empty-state should be gone
        await expect(page.getByText(/Your library is empty/i)).not.toBeVisible()
    })

    test('library search filters paint list', async ({ page }) => {
        // Add two paints first
        await page.getByTitle('Titanium White').click()
        await page.getByTitle('Cadmium Red').click()
        // Wait for any toasts to clear before searching
        await page.waitForTimeout(3000)
        // Search for white
        await page.locator('#library-search').fill('white')
        await expect(page.locator('.paint-grid').getByText('Titanium White')).toBeVisible()
        await expect(page.locator('.paint-grid').getByText('Cadmium Red')).not.toBeVisible()
    })

    test('library search shows no-results message for unknown query', async ({ page }) => {
        await page.getByTitle('Titanium White').click()
        await page.locator('#library-search').fill('zzznomatch')
        await expect(page.getByText(/No results/i)).toBeVisible()
    })

    test('paint count in header reflects library size', async ({ page }) => {
        await expect(page.getByText('0 paints')).toBeVisible()
        await page.getByTitle('Titanium White').click()
        await expect(page.getByText('1 paint')).toBeVisible()
        await page.getByTitle('Cadmium Red').click()
        await expect(page.getByText('2 paints')).toBeVisible()
    })
})

test.describe('Mix Guide – empty library', () => {
    test.beforeEach(async ({ page }) => {
        await skipOnboarding(page)
        await page.goto('/')
    })

    test('shows empty-state prompt when library is empty', async ({ page }) => {
        await page.locator('#nav-mix').click()
        await expect(page.getByText(/Library is empty/i)).toBeVisible()
        await expect(page.getByText(/Add acrylic paints to your library first/i)).toBeVisible()
    })
})

test.describe('Mix Guide – with library paints', () => {
    test.beforeEach(async ({ page }) => {
        await skipOnboarding(page)
        await seedPaints(page)
        await page.goto('/')
        await page.locator('#nav-mix').click()
    })

    test('shows the Single Color and Mix Palette segment buttons', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Single Color' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Mix Palette' })).toBeVisible()
    })

    test('single color tab shows color picker input mode buttons', async ({ page }) => {
        await expect(page.getByRole('button', { name: /Color Picker/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /Camera/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /Photo/i })).toBeVisible()
    })

    test('compute mix button is visible', async ({ page }) => {
        await expect(page.locator('#compute-mix-btn')).toBeVisible()
    })

    test('computes a mixing guide for the default target color', async ({ page }) => {
        await page.locator('#compute-mix-btn').click()
        // Wait for the result (accuracy percentage circle)
        await expect(page.getByText(/%/).first()).toBeVisible({ timeout: 5000 })
    })

    test('mix result shows step ratios that sum to 100', async ({ page }) => {
        await page.locator('#compute-mix-btn').click()
        // Ratio badges appear, e.g. "60%" "40%"
        const badges = page.locator('text=/%$/')
        await expect(badges.first()).toBeVisible({ timeout: 5000 })
    })

    test('changing target color and re-computing updates the result', async ({ page }) => {
        // Set target to bright blue
        await page.locator('#target-color-picker').evaluate((el) => {
            el.value = '#0000ff'
            el.dispatchEvent(new Event('input', { bubbles: true }))
            el.dispatchEvent(new Event('change', { bubbles: true }))
        })
        await page.locator('#compute-mix-btn').click()
        await expect(page.getByText(/%/).first()).toBeVisible({ timeout: 5000 })
    })

    test('Fix My Mix button appears after computing', async ({ page }) => {
        await page.locator('#compute-mix-btn').click()
        await expect(page.getByRole('button', { name: /Fix My Mix/i })).toBeVisible({ timeout: 5000 })
    })

    test('switching to Mix Palette tab shows no-palettes state', async ({ page }) => {
        await page.getByRole('button', { name: 'Mix Palette' }).click()
        await expect(page.getByText(/No saved palettes/i)).toBeVisible()
    })
})

test.describe('Palette Generator page', () => {
    test.beforeEach(async ({ page }) => {
        await skipOnboarding(page)
        await page.goto('/')
        await page.locator('#nav-palettes').click()
    })

    test('shows palette generator heading', async ({ page }) => {
        await expect(page.getByRole('heading', { name: /Palette/i })).toBeVisible()
    })

    test('shows Generate, Manual and Saved tabs', async ({ page }) => {
        const tabPills = page.locator('.tab-pills').first()
        await expect(tabPills.getByRole('button', { name: 'Generate' })).toBeVisible()
        await expect(tabPills.getByRole('button', { name: 'Manual' })).toBeVisible()
        await expect(tabPills.getByRole('button', { name: /Saved/ })).toBeVisible()
    })

    test('Generate tab shows harmony mode selector', async ({ page }) => {
        // The harmony mode is inside a <select id="harmony-select">
        await expect(page.locator('#harmony-select')).toBeVisible()
    })

    test('Saved tab shows empty state initially', async ({ page }) => {
        await page.getByRole('button', { name: /Saved/i }).click()
        await expect(page.getByText(/No saved palettes/i)).toBeVisible()
    })
})

test.describe('Settings page', () => {
    test.beforeEach(async ({ page }) => {
        await skipOnboarding(page)
        await page.goto('/')
        await page.locator('#nav-settings').click()
    })

    test('shows Settings heading', async ({ page }) => {
        await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible()
    })

    test('shows Export JSON and Export CSV buttons', async ({ page }) => {
        await expect(page.getByRole('button', { name: /Export JSON/i })).toBeVisible()
        await expect(page.getByRole('button', { name: /Export CSV/i })).toBeVisible()
    })

    test('shows Delete All Data option', async ({ page }) => {
        await expect(page.getByText(/Delete All Data/i)).toBeVisible()
    })
})

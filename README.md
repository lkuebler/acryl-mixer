# 🎨 Acryl Mixer

A mobile-first web app for managing your acrylic paint library, generating color palettes, and getting mixing guides.

> 🤖 **Fully vibecoded** — this app was built entirely with AI assistance.

**🌐 Live:** [https://lkuebler.github.io/acryl-mixer/](https://lkuebler.github.io/acryl-mixer/)

**📦 Repo:** [https://github.com/lkuebler/acryl-mixer](https://github.com/lkuebler/acryl-mixer)

---

## Features

- **Library** — Store your acrylic paints with color, brand, and product code. Pick colors from a photo by tapping any spot.
- **Palettes** — Generate harmonious color combinations (analogous, complementary, triadic, etc.) and save them.
- **Mix Guide** — Get step-by-step mixing recipes for a single color or an entire saved palette. Supports photo color picking.
- **Settings** — Export/import your full library and palettes as JSON.

## Tech Stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/)
- [chroma-js](https://gka.github.io/chroma.js/) for color math
- [idb](https://github.com/jakearchibald/idb) for IndexedDB storage
- Deployed via [GitHub Actions → GitHub Pages](.github/workflows/deploy.yml)

## Local Development

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173/acryl-mixer/`.

## Deploy

Every push to `main` automatically builds and deploys to GitHub Pages via the included workflow.

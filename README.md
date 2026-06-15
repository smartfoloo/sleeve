# Poster Studio

Paste a **Spotify album link** and generate three print-ready A4 album posters in
the styles of a [Claude Design](https://claude.ai/design) original (the "DTMF —
Poster Studies" set). Each poster pulls the album's real cover, tracklist, and
total Spotify streams — and any of them can be spun around in a **three.js 3D
viewer**.

## How it works

No API keys required. Everything is scraped server-side:

| Data | Source |
| --- | --- |
| Cover, title, artist, tracklist (+ features) | Spotify public **embed** page (`__NEXT_DATA__`) |
| Release date + primary artist Spotify ID | Spotify album page (crawler UA → full SSR HTML) |
| Total streams | The artist's **kworb** `_albums.html`, matched by album ID |

When kworb has no total for an album, the UI shows a **manual streams** field so
you can paste the number yourself.

### The three poster styles

1. **El Disco** — editorial / gallery (Instrument Serif, two-column tracklist, black stat band)
2. **Más Fotos** — analog / film (taped photo print, date stamp, typed tracklist)
3. **Croma** — posterfy-inspired; the **background is pulled from the cover**. The
   artwork sits **edge-to-edge** at the top and **fades** into a background colour
   sampled from the **bottom 30%** of the cover (read client-side from a
   downscaled canvas of the same-origin image). Ink is the **darkest or lightest
   colour** found in the cover, chosen for contrast against that background.

Long tracklists (20+) and long titles or song names are auto-fit: the
tracklists scale their type density and titles shrink, so nothing clips the
frame.

### 3D view

Every poster has a **3D** button. It rasterises the poster (same pipeline as the
PNG export) and maps it onto a thin printed slab in a three.js scene — soft
studio lighting, a contact shadow, **drag to rotate, scroll to zoom** (Esc or
click-away to close). three.js is loaded lazily so it never weighs on first paint.

Each poster can be downloaded as a high-res **PNG** or a print-ready **A4 PDF**.
Fonts are inlined for export via `/api/fonts`, and the cover is served
same-origin through `/api/cover` so the canvas isn't tainted (and the palette
read isn't blocked).

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build && npm run preview   # production build
```

## Routes

- `GET /api/album?link=<spotify album url>` → `{ album, streams }`
- `GET /api/cover?u=<spotify image url>` → image proxy (same-origin)
- `GET /api/fonts` → poster web fonts as CSS with inlined woff2 (for export)

Built with SvelteKit. Scraping logic lives in `src/lib/server/scrape.js`; poster
components in `src/lib/posters/` (palette extraction in `palette.js`, overflow
helpers in `util.js`); the three.js viewer in `src/lib/Viewer3D.svelte`.

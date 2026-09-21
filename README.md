# Sleeve

Create beautiful designed posters from any Spotify album link.

Paste an album URL, pick one of four graphic styles, tweak the palette and typography, then export as PNG, PDF, or preview it on a 3D record sleeve.

## Designs

| # | Name | Style |
|---|------|-------|
| 01 | Editorial | Gallery print |
| 02 | Polaroid | Taped photo |
| 03 | Full Bleed | Cover to the edge |
| 04 | Vinyl | Cover as a record |

## Where the data comes from

Nothing is requested from Spotify. The pasted link is parsed locally for its
album id, which MusicBrainz stores as a URL relationship — so the link resolves
to a release without ever contacting Spotify. Metadata is CC0.

Covers come from three sources, all addressed **by id** rather than by name:
MusicBrainz stores each release's Apple and Deezer URLs as relationships, and
Cover Art Archive is keyed by release MBID. This matters — searching by album
name reliably turns up deluxe, remastered and alternate-language editions whose
artwork differs from the record you asked for. Name search is a last resort for
releases MusicBrainz hasn't linked.

No single source wins often enough to be the default: Cover Art Archive is
sometimes far better (6000px seen) but sometimes isn't even square, Apple is
consistently square but capped at its master, and Deezer is a modest but
dependable floor. Candidates are measured, non-square ones discarded, and the
largest survivor wins. You can always upload your own cover instead.

All three send permissive CORS headers, so covers are fetched by the browser
and never pass through the server.

| Source | Role |
|---|---|
| MusicBrainz | Artist, title, release date, tracklist, runtime |
| Cover Art Archive | Cover candidate (up to 6000px seen) |
| Apple (iTunes Search) | Cover candidate (up to 3000px) |
| Deezer | Cover candidate (up to 1400px) |

## Setup

```bash
npm install
npm run dev
```

## Stack

SvelteKit · Three.js · html-to-image · jsPDF

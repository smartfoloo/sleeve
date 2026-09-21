// Shared helpers for keeping posters inside their fixed 600×848 frame no
// matter how the album data varies (20+ track lists, very long titles,
// huge stream counts). Each poster imports what it needs.

/**
 * Density factor for a two-column tracklist. The DTMF reference set was tuned
 * for 17 tracks (≈9 rows per column); past that we shrink row font-size and
 * padding so a 20- or 30-track album still fits instead of clipping.
 * Returns 1 for any album that already fits (≤18 tracks).
 */
/**
 * The one small-text size every poster uses — meta lines, labels, track numbers
 * and track titles all share it, so nothing on a poster is smaller than this.
 * It is a floor, not a starting point: long tracklists gain a column rather
 * than shrinking the type below it.
 */
export const META_FS = 16;

/**
 * Split a tracklist into balanced columns. Two reads best, but past ~22 tracks
 * two columns can't hold the list at META_FS, so a third is added instead of
 * letting the type shrink.
 */
export function trackColumns(tracks, mono = false) {
	const list = tracks || [];
	// A monochrome cover leaves the poster stark and typographic, which carries a
	// denser tracklist well, so it reaches for a third column sooner than a
	// colour cover does.
	const threeAt = mono ? 16 : 22;
	const cols = list.length > 30 ? 4 : list.length > threeAt ? 3 : 2;
	const per = Math.ceil(list.length / cols) || 1;
	return Array.from({ length: cols }, (_, i) => list.slice(i * per, (i + 1) * per)).filter(
		(c) => c.length
	);
}

export function trackScale(count, base = 9) {
	const perCol = Math.ceil((count || 0) / 2) || 1;
	return Math.min(1, base / perCol);
}

/**
 * Pick a title font-size that won't overflow horizontally. `base` is the
 * design's size (tuned for the ~20-char "Debí Tirar Más Fotos"); long titles
 * or long single words scale it down toward `min`.
 */
export function titleSize(title, base, min = Math.round(base * 0.5)) {
	const t = (title || '').trim();
	if (!t) return base;
	const longest = t.split(/\s+/).reduce((m, w) => Math.max(m, w.length), 0);
	const byLen = 22 / Math.max(t.length, 1);
	const byWord = 12 / Math.max(longest, 1);
	return Math.max(min, Math.round(base * Math.min(1, byLen, byWord)));
}

/** A cover shown exactly as delivered: filling its frame, centred, unzoomed. */
export const FRAME_NEUTRAL = { zoom: 1, x: 0, y: 0 };

// Below 1 the cover no longer fills its frame and the poster's own background
// shows through around it; above 1 it is cropped. 1 is "fills exactly".
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;

/**
 * CSS transform that applies a user's cover framing.
 *
 * `zoom` is a multiple of the frame (1 = fill exactly). `x`/`y` are normalized
 * pan: 0 is centred and ±1 is as far as the image can travel before an edge
 * would enter the frame, so the same values reframe every layout identically
 * regardless of whether its frame is 148px or 600px across.
 *
 * Percentages in `translate()` resolve against the element's own size — the
 * frame, since the image is sized 100%/100% — which is what makes the values
 * frame-size independent. `scale` is written last so it applies first and the
 * translation stays in the frame's own coordinate space.
 */
export function coverTransform(frame) {
	const zoom = clampZoom(frame?.zoom);
	if (zoom === 1) return 'none';
	// Zoomed in, the travel is the overflow hidden beyond each edge; zoomed out
	// it is the slack left inside the frame. Only the magnitude differs, so ±1
	// still means "an edge of the image meets an edge of the frame" either way.
	const max = (Math.abs(zoom - 1) / 2) * 100; // furthest travel, as % of the frame
	const x = (clamp1(frame?.x) * max).toFixed(3);
	const y = (clamp1(frame?.y) * max).toFixed(3);
	return `translate(${x}%, ${y}%) scale(${zoom})`;
}

const clamp1 = (n) => Math.max(-1, Math.min(1, Number(n) || 0));
export const clampZoom = (n) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(n) || 1));

/**
 * Parse a "#rrggbb" hex string into { r, g, b }. Falls back to mid-grey on
 * anything malformed so a poster never renders an invalid colour.
 */
export function hexToRgb(hex) {
	const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
	if (!m) return { r: 128, g: 128, b: 128 };
	const int = parseInt(m[1], 16);
	return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

/** Relative luminance (0–1) of a hex colour. */
export function lumOf(hex) {
	const { r, g, b } = hexToRgb(hex);
	return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** "rgba(r,g,b,a)" for a hex colour at the given alpha. */
export function withAlpha(hex, a) {
	const { r, g, b } = hexToRgb(hex);
	return `rgba(${r},${g},${b},${a})`;
}

/**
 * Svelte action: shrink a tracklist so it never overflows its slot, whatever
 * font the user picks. The element's text sizes must be authored as
 * `calc(<px> * var(--fit, 1))`; this sets `--fit` (1 → smaller) until the
 * content fits within `bottom` (the max y, in unscaled poster px, measured from
 * the `.poster-root` top). Re-runs whenever `params.deps` changes and once web
 * fonts finish loading. Layout offsets are used (not getBoundingClientRect) so
 * the grid's `scale(0.6)` transform doesn't skew the maths.
 */
export function autofit(node, params) {
	let raf = 0;
	const schedule = () => {
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(() => fit(node, params));
	};
	schedule();
	if (typeof document !== 'undefined' && document.fonts?.ready) {
		document.fonts.ready.then(schedule).catch(() => {});
	}
	return {
		update(p) {
			params = p;
			schedule();
		},
		destroy() {
			cancelAnimationFrame(raf);
		}
	};
}

function fit(node, { bottom = 744, root = '.poster-root', min = 0.12 } = {}) {
	const rootEl = node.closest(root);
	if (!rootEl) return;

	// Start from a clean slate. A clamp left by the previous run shortens this
	// node, which grows the `margin-top:auto` block above it and pushes the node
	// down; measuring in that state reports a smaller budget, which clamps
	// harder still — so the list ratchets off the bottom of the frame a little
	// further on every font change.
	node.style.maxHeight = '';
	node.style.overflow = '';
	node.style.setProperty('--fit', '1');

	// Distance from the poster top to this node, in layout (untransformed) px,
	// read from the cleared layout above. The budget is fixed from this one
	// reading: where a `margin-top:auto` anchors the block to the bottom, the
	// node's top rises as it shrinks, so re-measuring inside the loop would
	// never converge.
	let top = 0;
	let el = node;
	while (el && el !== rootEl) {
		top += el.offsetTop;
		el = el.offsetParent;
	}

	const avail = bottom - top;
	if (avail <= 0) return;
	node.style.maxHeight = avail + 'px';
	node.style.overflow = 'hidden';
	let f = 1;
	let guard = 60;
	while (node.scrollHeight > avail + 0.5 && f > min && guard-- > 0) {
		f -= 0.035;
		node.style.setProperty('--fit', f.toFixed(3));
	}
}


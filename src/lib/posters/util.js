// Shared helpers for keeping posters inside their fixed 600×848 frame no
// matter how the album data varies (20+ track lists, very long titles,
// huge stream counts). Each poster imports what it needs.

/**
 * Density factor for a two-column tracklist. The DTMF reference set was tuned
 * for 17 tracks (≈9 rows per column); past that we shrink row font-size and
 * padding so a 20- or 30-track album still fits instead of clipping.
 * Returns 1 for any album that already fits (≤18 tracks).
 */
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

function fit(node, { bottom = 744, root = '.poster-root', min = 0.45 } = {}) {
	const rootEl = node.closest(root);
	if (!rootEl) return;
	// Distance from the poster top to this node, in layout (untransformed) px.
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
	node.style.setProperty('--fit', '1');
	let guard = 60;
	while (node.scrollHeight > avail + 0.5 && f > min && guard-- > 0) {
		f -= 0.035;
		node.style.setProperty('--fit', f.toFixed(3));
	}
}

/**
 * Compact form of a formatted stream count ("12,035,304,057") for the
 * stat-hero layouts: { num: "12.03", unit: "Billion", abbr: "12.03B" }.
 */
export function compactStreams(streamsStr) {
	const n = Number(String(streamsStr || '').replace(/[^0-9]/g, ''));
	if (!n) return { num: '—', unit: '', abbr: '—' };
	const tiers = [
		[1e9, 'Billion', 'B'],
		[1e6, 'Million', 'M'],
		[1e3, 'Thousand', 'K']
	];
	for (const [b, unit, suffix] of tiers) {
		if (n >= b) {
			const v = n / b;
			const num = v >= 100 ? String(Math.round(v)) : String(Math.round(v * 100) / 100);
			return { num, unit, abbr: num + suffix };
		}
	}
	return { num: String(n), unit: '', abbr: String(n) };
}

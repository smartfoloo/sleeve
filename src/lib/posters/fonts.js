// Font menu shared by every poster + the edit modal. All but `sf` are loaded
// both on-screen (app.html <link>) and inlined for export (/api/fonts), so they
// render identically in PNG/PDF. `sf` is the system San-Francisco stack — it
// looks right on Apple devices and falls back to Helvetica/sans elsewhere.
//
// A `weight` here is the weight that face is *always* drawn at, overriding the
// per-element weights the poster layouts ask for. Only Inter sets one: it is
// loaded at 200 and meant to stay light wherever it is used.
//
// `width` is the measured advance-width ratio against Instrument Serif, which
// the poster title sizes were originally tuned on. Instrument Serif is unusually
// condensed — every other face here is 1.3-1.6x wider at the same point size —
// so titles are scaled by this factor to keep them inside the 600x848 frame.
export const FONTS = {
	baskerville: { label: 'Libre Baskerville', family: 'Libre Baskerville', stack: "'Libre Baskerville', serif", width: 0.61 },
	serif: { label: 'Instrument Serif', family: 'Instrument Serif', stack: "'Instrument Serif', serif", width: 1 },
	inter: { label: 'Inter', family: 'Inter', stack: "'Inter', sans-serif", width: 0.718, weight: 200 },
	publicsans: { label: 'Public Sans', family: 'Public Sans', stack: "'Public Sans', sans-serif", width: 0.709 },
	sf: { label: 'SF Pro', stack: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif", width: 0.789 },
	grotesk: { label: 'Space Grotesk', family: 'Space Grotesk', stack: "'Space Grotesk', sans-serif", width: 0.739 },
	opensans: { label: 'Open Sans', family: 'Open Sans', stack: "'Open Sans', sans-serif", width: 0.748 },
	roboto: { label: 'Roboto', family: 'Roboto', stack: "'Roboto', sans-serif", width: 0.759 },
	rubik: { label: 'Rubik', family: 'Rubik', stack: "'Rubik', sans-serif", width: 0.733 },
	montserrat: { label: 'Montserrat', family: 'Montserrat', stack: "'Montserrat', sans-serif", width: 0.67 }
};

// Order the dropdown lists in.
export const FONT_KEYS = [
	'baskerville',
	'serif',
	'inter',
	'publicsans',
	'sf',
	'grotesk',
	'opensans',
	'roboto',
	'rubik',
	'montserrat'
];

// The five text roles each poster exposes, in panel order.
export const ROLES = [
	{ key: 'title', label: 'Title' },
	{ key: 'artist', label: 'Artist' },
	{ key: 'labels', label: 'Labels / meta' },
	{ key: 'tracklist', label: 'Tracklist' },
	{ key: 'runtime', label: 'Runtime' }
];

// Per-poster default font for each role. The serif is reserved for the album
// title alone; Inter at 200 carries everything else. Every other face stays
// selectable but is nobody's default.
// Indexed to STYLES order: [Poster1, Poster2, Poster3, Poster4].
export const ROLE_DEFAULTS = [
	{ title: 'baskerville', artist: 'inter', labels: 'inter', tracklist: 'inter', runtime: 'inter' },
	{ title: 'baskerville', artist: 'inter', labels: 'inter', tracklist: 'inter', runtime: 'inter' },
	{ title: 'baskerville', artist: 'inter', labels: 'inter', tracklist: 'inter', runtime: 'inter' },
	{ title: 'baskerville', artist: 'inter', labels: 'inter', tracklist: 'inter', runtime: 'inter' }
];

/** Resolve a poster's font props into role → CSS stack, filling any gaps from
 * that poster's defaults. `sel` is a partial { role: fontKey } map. */
export function resolveFonts(defaults, sel) {
	const out = {};
	for (const { key } of ROLES) {
		const fk = (sel && sel[key]) || defaults[key];
		out[key] = (FONTS[fk] || FONTS[defaults[key]]).stack;
	}
	return out;
}

/** Role → the font's own fixed weight, or null to keep the layout's weight. */
export function resolveWeights(defaults, sel) {
	const out = {};
	for (const { key } of ROLES) {
		const fk = (sel && sel[key]) || defaults[key];
		out[key] = (FONTS[fk] || FONTS[defaults[key]]).weight ?? null;
	}
	return out;
}

/** The Google Fonts families this poster actually draws with, so an export
 * embeds only those rather than the whole menu. `sf` is a system stack and has
 * no family, so it contributes nothing to embed. */
export function googleFamilies(defaults, sel) {
	const out = new Set();
	for (const { key } of ROLES) {
		const fk = (sel && sel[key]) || defaults[key];
		const family = (FONTS[fk] || FONTS[defaults[key]]).family;
		if (family) out.add(family);
	}
	return [...out];
}

/** Title-size multiplier for whichever font fills `role` on this poster. */
export function fontWidthScale(defaults, sel, role = 'title') {
	const fk = (sel && sel[role]) || defaults[role];
	return (FONTS[fk] || FONTS[defaults[role]]).width ?? 1;
}

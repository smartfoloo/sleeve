// Font menu shared by every poster + the edit modal. All but `sf` are loaded
// both on-screen (app.html <link>) and inlined for export (/api/fonts), so they
// render identically in PNG/PDF. `sf` is the system San-Francisco stack — it
// looks right on Apple devices and falls back to Helvetica/sans elsewhere.
export const FONTS = {
	serif: { label: 'Instrument Serif', stack: "'Instrument Serif', serif" },
	sf: { label: 'SF Pro', stack: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif" },
	archivo: { label: 'Archivo', stack: "'Archivo', sans-serif" },
	mono: { label: 'Space Mono', stack: "'Space Mono', monospace" },
	anton: { label: 'Anton', stack: "'Anton', sans-serif" },
	grotesk: { label: 'Space Grotesk', stack: "'Space Grotesk', sans-serif" }
};

// Order the dropdown lists in.
export const FONT_KEYS = ['serif', 'sf', 'archivo', 'mono', 'anton', 'grotesk'];

// The five text roles each poster exposes, in panel order.
export const ROLES = [
	{ key: 'title', label: 'Title' },
	{ key: 'artist', label: 'Artist' },
	{ key: 'labels', label: 'Labels / meta' },
	{ key: 'tracklist', label: 'Tracklist' },
	{ key: 'streams', label: 'Streams' }
];

// Per-poster default font for each role, chosen to preserve each design's
// current look. Indexed to STYLES order: [Poster1, Poster2, Poster3].
export const ROLE_DEFAULTS = [
	{ title: 'serif', artist: 'serif', labels: 'archivo', tracklist: 'sf', streams: 'serif' },
	{ title: 'serif', artist: 'mono', labels: 'mono', tracklist: 'mono', streams: 'mono' },
	{ title: 'serif', artist: 'mono', labels: 'mono', tracklist: 'sf', streams: 'serif' }
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

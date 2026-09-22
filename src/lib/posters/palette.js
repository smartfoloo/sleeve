// Client-side colour extraction from the (same-origin, proxied) album cover.
//
// Returns one shared set of five dominant cover colours (the swatches users
// pick from) plus a sensible default background + ink for each poster:
//   • Poster 3 ("Croma") keeps its original look — background sampled from the
//     cover's *bottom 30%* so the artwork fades cleanly into it.
//   • Posters 1 & 2 now auto-detect their background from the cover too, using
//     the overall dominant colour, with an auto-contrasting ink.

function loadImage(url) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = url;
	});
}

const hex = ({ r, g, b }) =>
	'#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
const rgba = ({ r, g, b }, a) => `rgba(${r},${g},${b},${a})`;
const dist2 = (a, b) => (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;

// The default ink on every poster.
const INK = '#ffffff';

// Snap a candidate colour to the closest one of `options` so every default we
// hand out is guaranteed to be a selectable swatch (and not some raw cover
// pixel that never appears in the picker).
function nearest(target, options) {
	let best = options[0];
	let bestD = dist2(best, target);
	for (const o of options) {
		const d = dist2(o, target);
		if (d < bestD) {
			bestD = d;
			best = o;
		}
	}
	return best;
}

// Tally 16-level-per-channel buckets over a pixel range, keeping true averages.
function histogram(data, start, end) {
	const buckets = new Map();
	for (let i = start; i < end; i += 4) {
		if (data[i + 3] < 125) continue;
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const key = (r >> 4) + '-' + (g >> 4) + '-' + (b >> 4);
		let e = buckets.get(key);
		if (!e) buckets.set(key, (e = { n: 0, r: 0, g: 0, b: 0 }));
		e.n++;
		e.r += r;
		e.g += g;
		e.b += b;
	}
	return [...buckets.values()]
		.map((e) => ({ n: e.n, r: Math.round(e.r / e.n), g: Math.round(e.g / e.n), b: Math.round(e.b / e.n) }))
		.sort((a, b) => b.n - a.n);
}

// Greedily pick up to `count` visually distinct colours from a count-sorted
// histogram so the swatch row isn't five near-identical shades.
function distinct(pool, count, minDist = 46) {
	const min2 = minDist * minDist;
	const picked = [];
	for (const c of pool) {
		if (picked.every((p) => dist2(p, c) >= min2)) picked.push(c);
		if (picked.length >= count) break;
	}
	// Top up with the most common remaining colours if the cover is low-variety.
	for (const c of pool) {
		if (picked.length >= count) break;
		if (!picked.includes(c)) picked.push(c);
	}
	return picked.slice(0, count);
}

// Mean per-pixel chroma (max channel − min channel, 0–255). A literal
// black-and-white cover sits near zero; anything with real colour climbs fast.
// Measured: Die Lit 0.08, Metallica 0.42, With The Beatles 1.9 — then the
// colour covers start at Whole Lotta Red 4.9, Blonde 10.1, good kid 23.8.
// 3 sits in that gap, so duotone and sepia covers stay on the colour side.
const MONO_CHROMA = 3;

function meanChroma(data) {
	let sum = 0;
	let n = 0;
	for (let i = 0; i < data.length; i += 4) {
		if (data[i + 3] < 125) continue;
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		sum += Math.max(r, g, b) - Math.min(r, g, b);
		n++;
	}
	return n ? sum / n : 0;
}

const FALLBACK = {
	swatches: ['#1a1a17', '#3a3a33', '#7a756a', '#b8b1a0', '#f2ecdd'],
	mono: false,
	p1: { bg: '#1a1a17', text: INK },
	p2: { bg: '#1a1a17', text: INK },
	p3: { bg: '#1a1a17', text: INK },
	p4: { bg: '#1a1a17', text: INK }
};

/**
 * Returns { swatches, p1, p2, p3 }:
 *   swatches — five distinct dominant cover colours (hex), shared by all posters
 *   pN.bg / pN.text — that poster's default background + ink (hex)
 */
export async function extractPalette(url) {
	const img = await loadImage(url);
	const W = 80;
	const H = 80;
	const canvas = document.createElement('canvas');
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	ctx.drawImage(img, 0, 0, W, H);
	const { data } = ctx.getImageData(0, 0, W, H);

	const all = histogram(data, 0, data.length);
	if (!all.length) return FALLBACK;

	// Five distinct dominant colours across the whole cover (the swatch set,
	// used as the background options).
	const present = all.filter((c) => c.n >= 3); // drop stray-pixel noise
	const pool = present.length ? present : all;
	const swatchColors = distinct(pool, 5);
	const swatches = swatchColors.map(hex);

	// Poster 3 keeps its original background: dominant colour of the bottom 30%,
	// snapped to a swatch so the default background is one of the five options.
	const bottomStart = Math.floor(H * 0.7) * W * 4;
	const bottom = histogram(data, bottomStart, data.length);
	const p3bg = nearest(bottom.length ? bottom[0] : pool[0], swatchColors);

	// Posters 1 & 2: overall dominant colour as background (also a swatch).
	const topBg = nearest(pool[0], swatchColors);

	return {
		swatches,
		// Drives the denser tracklist on monochrome covers (see trackColumns).
		mono: meanChroma(data) <= MONO_CHROMA,
		// Ink is white on every design by default. It used to be picked for
		// contrast against each background, which meant dark type whenever the
		// cover's dominant colour came out light; white reads as one deliberate
		// house style instead. Both remain selectable per design in the editor.
		p1: { bg: hex(topBg), text: INK },
		p2: { bg: hex(topBg), text: INK },
		p3: { bg: hex(p3bg), text: INK },
		// Poster 4 ("Vinyl"): solid dominant-colour background, like p1/p2.
		p4: { bg: hex(topBg), text: INK }
	};
}

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

const lum = ({ r, g, b }) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const hex = ({ r, g, b }) =>
	'#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
const rgba = ({ r, g, b }, a) => `rgba(${r},${g},${b},${a})`;
const dist2 = (a, b) => (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;

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

const FALLBACK = {
	swatches: ['#1a1a17', '#3a3a33', '#7a756a', '#b8b1a0', '#f2ecdd'],
	p1: { bg: '#1a1a17', text: '#f2ecdd' },
	p2: { bg: '#1a1a17', text: '#f2ecdd' },
	p3: { bg: '#1a1a17', text: '#f2ecdd' }
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

	// Five distinct dominant colours across the whole cover (the swatch set).
	const present = all.filter((c) => c.n >= 3); // drop stray-pixel noise
	const pool = present.length ? present : all;
	const swatchColors = distinct(pool, 5);
	const swatches = swatchColors.map(hex);

	// Darkest & lightest present colours, used to pick contrasting ink.
	let darkest = pool[0];
	let lightest = pool[0];
	for (const c of pool) {
		if (lum(c) < lum(darkest)) darkest = c;
		if (lum(c) > lum(lightest)) lightest = c;
	}
	const inkFor = (bg) => (lum(bg) > 0.5 ? darkest : lightest);

	// Poster 3 keeps its original background: dominant colour of the bottom 30%.
	const bottomStart = Math.floor(H * 0.7) * W * 4;
	const bottom = histogram(data, bottomStart, data.length);
	const p3bg = bottom.length ? bottom[0] : pool[0];

	// Posters 1 & 2: overall dominant colour as background.
	const topBg = pool[0];

	return {
		swatches,
		p1: { bg: hex(topBg), text: hex(inkFor(topBg)) },
		p2: { bg: hex(topBg), text: hex(inkFor(topBg)) },
		p3: { bg: hex(p3bg), text: hex(inkFor(p3bg)) }
	};
}

// Returns poster web fonts as a single CSS string with the woff2 files inlined
// as data URIs. The client passes this to html-to-image's `fontEmbedCSS` so
// exported PNG/PDF render with the real typefaces (the browser can't read the
// cross-origin Google Fonts stylesheet from inside the export's SVG sandbox).
//
// `?families=` narrows the response to the faces a poster actually uses. The
// full set is ~2MB of base64, and every capture embeds the whole string into
// the SVG, so sending only what's drawn keeps exports quick. No parameter
// returns everything, which is what app.html's own <link> needs.

// Each family's css2 axis spec — the weights and italics the posters can ask
// for. Keys match FONTS[*].family in src/lib/posters/fonts.js.
const FAMILY_SPEC = {
	Anton: 'Anton',
	'Instrument Serif': 'Instrument+Serif:ital@0;1',
	// Inter pins itself to weight 200 (FONTS.inter.weight), so resolveWeights
	// always draws it at 200 and the other weights would be embedded unused.
	Inter: 'Inter:ital,wght@0,200;1,200',
	'Libre Baskerville': 'Libre+Baskerville:ital,wght@0,400;0,700;1,400',
	'Public Sans': 'Public+Sans:wght@400;500;600;700',
	'Space Grotesk': 'Space+Grotesk:wght@400;500;600;700',
	'Space Mono': 'Space+Mono:wght@400;700'
};

// A modern browser UA makes Google Fonts serve woff2 (vs. legacy ttf).
const BROWSER_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

const cssCache = new Map(); // family-set key → assembled CSS
const fileCache = new Map(); // woff2 URL → data URI, shared across family sets

async function dataUri(url) {
	let uri = fileCache.get(url);
	if (!uri) {
		const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
		uri = `data:font/woff2;base64,${buf.toString('base64')}`;
		fileCache.set(url, uri);
	}
	return uri;
}

async function buildCss(families) {
	const url =
		'https://fonts.googleapis.com/css2?' +
		families.map((f) => `family=${FAMILY_SPEC[f]}`).join('&') +
		'&display=swap';
	const css = await (await fetch(url, { headers: { 'User-Agent': BROWSER_UA } })).text();

	// Keep only the Latin / Latin-ext faces (covers English + Spanish accents).
	const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]+\})/g)].filter(
		(m) => m[1] === 'latin' || m[1] === 'latin-ext'
	);

	const out = [];
	for (const [, , block] of blocks) {
		const woff2 = block.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
		out.push(woff2 ? block.replace(woff2, await dataUri(woff2)) : block);
	}
	return out.join('\n');
}

export async function GET({ url }) {
	const asked = (url.searchParams.get('families') || '')
		.split(',')
		.map((f) => f.trim())
		.filter((f) => FAMILY_SPEC[f]);
	const families = [...new Set(asked.length ? asked : Object.keys(FAMILY_SPEC))].sort();

	// The promise is cached, not just the result, so concurrent first requests
	// share one build; a failure is evicted so the next request can retry.
	const key = families.join('|');
	if (!cssCache.has(key)) {
		cssCache.set(
			key,
			buildCss(families).catch((e) => {
				cssCache.delete(key);
				throw e;
			})
		);
	}

	return new Response(await cssCache.get(key), {
		headers: { 'Content-Type': 'text/css', 'Cache-Control': 'public, max-age=604800' }
	});
}

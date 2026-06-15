// Returns the poster web fonts as a single CSS string with the woff2 files
// inlined as data URIs. The client passes this to html-to-image's `fontEmbedCSS`
// so exported PNG/PDF render with the real typefaces (the browser can't read the
// cross-origin Google Fonts stylesheet from inside the export's SVG sandbox).

const CSS_URL =
	'https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap';
// A modern browser UA makes Google Fonts serve woff2 (vs. legacy ttf).
const BROWSER_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

let cached = '';

export async function GET() {
	if (!cached) {
		const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': BROWSER_UA } })).text();

		// Keep only the Latin / Latin-ext faces (covers English + Spanish accents).
		const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]+\})/g)].filter(
			(m) => m[1] === 'latin' || m[1] === 'latin-ext'
		);

		const out = [];
		for (const [, , block] of blocks) {
			const url = block.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
			if (!url) {
				out.push(block);
				continue;
			}
			const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
			const dataUri = `data:font/woff2;base64,${buf.toString('base64')}`;
			out.push(block.replace(url, dataUri));
		}
		cached = out.join('\n');
	}

	return new Response(cached, {
		headers: { 'Content-Type': 'text/css', 'Cache-Control': 'public, max-age=604800' }
	});
}

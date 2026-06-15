// Server-side scrapers for Spotify (album metadata) and kworb (stream totals).
// No API keys: we read Spotify's public embed + album pages and the kworb HTML table.

const UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
// Spotify serves a stripped JS-shell to plain fetch clients but full server-rendered
// HTML (release date, primary artist id) to crawlers — so we identify as one.
const CRAWLER_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const MONTHS = [
	'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
	'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

/** Pull the 22-char base-62 album id out of any Spotify album link or URI. */
export function parseAlbumId(input) {
	if (!input) return null;
	const m = String(input).match(/album[:/]([A-Za-z0-9]{22})/);
	return m ? m[1] : null;
}

async function getText(url, ua = UA) {
	const res = await fetch(url, {
		headers: { 'User-Agent': ua, 'Accept': 'text/html', 'Accept-Language': 'en' }
	});
	if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
	return res.text();
}

// Bump a Spotify cover URL to its 640px variant for crisp posters.
function upscaleCover(url) {
	return url.replace(/ab67616d[0-9a-f]{8}/, 'ab67616d0000b273');
}

function fmtReleased(iso) {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
	if (!m) return { year: '', released: '', stampDate: '' };
	const [, y, mo, d] = m;
	const month = MONTHS[Number(mo) - 1] || '';
	return {
		year: y,
		released: `${month} ${Number(d)}, ${y}`,
		stampDate: `${mo}·${d}·'${y.slice(2)}`
	};
}

// Compact human form of a stream count, e.g. 12035304057 -> "12 billion".
function streamsShort(n) {
	if (!n) return '';
	if (n >= 1e9) return `${+(n / 1e9).toFixed(1)} billion`.replace('.0 ', ' ');
	if (n >= 1e6) return `${+(n / 1e6).toFixed(1)} million`.replace('.0 ', ' ');
	return n.toLocaleString('en-US');
}

/**
 * Fetch album metadata (title, artist, cover, tracklist, release date, primary
 * artist id) by reading Spotify's public embed + album pages.
 */
export async function fetchAlbum(albumId) {
	const [embedHtml, mainHtml] = await Promise.all([
		getText(`https://open.spotify.com/embed/album/${albumId}`),
		getText(`https://open.spotify.com/album/${albumId}`, CRAWLER_UA).catch(() => '')
	]);

	const nd = embedHtml.match(
		/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s
	);
	if (!nd) throw new Error('Could not read album data from Spotify.');
	const entity = JSON.parse(nd[1])?.props?.pageProps?.state?.data?.entity;
	if (!entity || entity.type !== 'album') {
		throw new Error('That link does not look like a Spotify album.');
	}

	const artist = entity.subtitle || '';
	const primaryNames = artist.split(',').map((s) => s.trim().toLowerCase());

	const tracks = (entity.trackList || []).map((t, i) => {
		const names = (t.subtitle || '').split(',').map((s) => s.trim());
		const feats = names.filter((n) => !primaryNames.includes(n.toLowerCase()));
		return { n: i + 1, t: t.title || '', feat: feats.join(' & ') };
	});

	const imgs = entity.visualIdentity?.image || [];
	const biggest = imgs.slice().sort((a, b) => (b.maxWidth || 0) - (a.maxWidth || 0))[0];
	const coverSrc = biggest ? upscaleCover(biggest.url) : '';

	// Release date + primary artist id live on the full album page.
	const isoDate = mainHtml.match(/music:release_date"\s+content="([^"]+)"/)?.[1] || '';
	const artistId =
		mainHtml.match(/music:musician"\s+content="[^"]*\/artist\/([A-Za-z0-9]{22})"/)?.[1] ||
		mainHtml.match(/\/artist\/([A-Za-z0-9]{22})/)?.[1] ||
		'';

	const { year, released, stampDate } = fmtReleased(isoDate);

	return {
		albumId,
		artistId,
		artist,
		artistUpper: artist.toUpperCase(),
		title: entity.name || entity.title || '',
		titleUpper: (entity.name || '').toUpperCase(),
		year,
		released,
		stampDate,
		trackCount: tracks.length,
		cover: coverSrc,
		tracks
	};
}

/**
 * Look up total Spotify streams for an album on its artist's kworb page.
 * Matches by album id (exact) first, then by normalized title. Returns null if
 * the album isn't tracked.
 */
export async function fetchStreams({ artistId, albumId, title }) {
	if (!artistId) return null;
	let html;
	try {
		html = await getText(`https://kworb.net/spotify/artist/${artistId}_albums.html`);
	} catch {
		return null;
	}

	const rows = [...html.matchAll(
		/<a href="https:\/\/open\.spotify\.com\/album\/([A-Za-z0-9]{22})"[^>]*>(.*?)<\/a>.*?<td>([\d,]+)<\/td>/gs
	)].map((m) => ({
		id: m[1],
		title: m[2].replace(/<[^>]+>/g, '').trim(),
		streams: m[3]
	}));

	const norm = (s) =>
		(s || '')
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '') // strip combining diacritics
			.replace(/[^a-z0-9]+/g, '');

	const byId = rows.find((r) => r.id === albumId);
	const hit = byId || rows.find((r) => norm(r.title) === norm(title));
	if (!hit) return null;

	const value = Number(hit.streams.replace(/,/g, ''));
	return { streamsStr: hit.streams, streams: value, streamsShort: streamsShort(value) };
}

export { streamsShort };

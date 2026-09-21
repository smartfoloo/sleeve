import { json, error } from '@sveltejs/kit';

// Deezer's image CDN sends CORS headers but api.deezer.com does not, so lookups
// are proxied here. Only this small JSON call passes through the server — the
// artwork itself is still fetched browser-side from the CDN.
//
// `id` is the exact album id from a MusicBrainz relationship; `q` is the
// name-search fallback for releases MusicBrainz hasn't linked.
export async function GET({ url, fetch }) {
	const id = (url.searchParams.get('id') || '').trim();
	const q = (url.searchParams.get('q') || '').trim();
	if (!id && !q) throw error(400, 'Missing query.');

	const endpoint = id
		? `https://api.deezer.com/album/${encodeURIComponent(id)}`
		: `https://api.deezer.com/search/album?q=${encodeURIComponent(q)}&limit=10`;

	let body;
	try {
		const res = await fetch(endpoint);
		if (!res.ok) throw new Error(`deezer ${res.status}`);
		body = await res.json();
	} catch {
		return json({ results: [] });
	}

	const rows = id ? (body?.id ? [body] : []) : body?.data || [];
	const results = rows.map((a) => ({
		title: a.title || '',
		artist: a.artist?.name || '',
		md5: a.md5_image || ''
	}));

	return json({ results });
}

import { json, error } from '@sveltejs/kit';
import { parseAlbumId, fetchAlbum, fetchStreams } from '$lib/server/scrape.js';

export async function GET({ url }) {
	const link = url.searchParams.get('link') || '';
	const albumId = parseAlbumId(link);
	if (!albumId) {
		throw error(400, 'Paste a Spotify album link (e.g. open.spotify.com/album/…).');
	}

	let album;
	try {
		album = await fetchAlbum(albumId);
	} catch (e) {
		throw error(502, e?.message || 'Could not read that album from Spotify.');
	}

	// Stream total is best-effort; the UI offers manual entry when it's null.
	let streams = null;
	try {
		streams = await fetchStreams({
			artistId: album.artistId,
			albumId: album.albumId,
			title: album.title
		});
	} catch {
		streams = null;
	}

	return json({ album, streams });
}

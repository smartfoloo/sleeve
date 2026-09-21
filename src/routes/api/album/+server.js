import { json, error } from '@sveltejs/kit';
import { parseAlbumId, albumFromSpotifyLink, albumFromSearch } from '$lib/server/musicbrainz.js';

// Resolve either a pasted Spotify link (?link=) or a typed artist + album
// (?artist=&title=), which is the fallback when MusicBrainz has no release
// carrying that Spotify URL. Artwork is not resolved here — the browser fetches
// it directly from the cover CDNs.
export async function GET({ url }) {
	const link = url.searchParams.get('link') || '';
	const artist = (url.searchParams.get('artist') || '').trim();
	const title = (url.searchParams.get('title') || '').trim();

	let album;
	try {
		if (artist && title) {
			album = await albumFromSearch(artist, title);
			if (!album) throw error(404, `No release found for “${artist} — ${title}”.`);
		} else {
			const albumId = parseAlbumId(link);
			if (!albumId) {
				throw error(400, 'Paste a Spotify album link (e.g. open.spotify.com/album/…).');
			}
			album = await albumFromSpotifyLink(albumId);
			if (!album) {
				throw error(
					404,
					'MusicBrainz has no entry for that album link yet — enter the artist and album name instead.'
				);
			}
		}
	} catch (e) {
		if (e?.status) throw e;
		throw error(502, e?.message || 'Could not look that album up.');
	}

	return json({ album });
}

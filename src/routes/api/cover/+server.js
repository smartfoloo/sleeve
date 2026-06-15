import { error } from '@sveltejs/kit';

// Same-origin proxy for the Spotify cover image so html-to-image / jsPDF can
// render it to canvas without cross-origin tainting.
export async function GET({ url, fetch }) {
	const src = url.searchParams.get('u') || '';
	if (!/^https:\/\/[\w.-]*spotifycdn\.com\//.test(src) && !/^https:\/\/i\.scdn\.co\//.test(src)) {
		throw error(400, 'Invalid cover source.');
	}

	const res = await fetch(src);
	if (!res.ok) throw error(502, 'Could not fetch cover image.');

	return new Response(res.body, {
		headers: {
			'Content-Type': res.headers.get('content-type') || 'image/jpeg',
			'Cache-Control': 'public, max-age=86400'
		}
	});
}

// MusicBrainz resolver: Spotify album link -> full release metadata.
//
// No API keys and no requests to Spotify: the pasted link is parsed locally for
// its id, then looked up as a stored URL relationship on MusicBrainz. All data
// returned here is CC0.

const MB = 'https://musicbrainz.org/ws/2';
// MusicBrainz requires an identifying User-Agent with contact info. Browsers
// can't set that header, which is why metadata is resolved server-side.
const UA = 'Sleeve/0.1 ( https://github.com/smartfoloo/sleeve )';

const MONTHS = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December'
];

/** Pull the 22-char base-62 album id out of any Spotify album link or URI. */
export function parseAlbumId(input) {
	if (!input) return null;
	const m = String(input).match(/album[:/]([A-Za-z0-9]{22})/);
	return m ? m[1] : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// MusicBrainz asks for at most one request per second. Every call queues behind
// the last one and the queue is spaced, so bursts from concurrent users still
// leave the service at the documented rate.
let queue = Promise.resolve();
const cache = new Map(); // url -> { at, data }
const TTL = 60 * 60 * 1000;

async function mbFetch(url) {
	const hit = cache.get(url);
	if (hit && Date.now() - hit.at < TTL) return hit.data;

	const result = queue.then(async () => {
		const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
		if (res.status === 404) return null;
		if (!res.ok) throw new Error(`musicbrainz ${res.status}`);
		return res.json();
	});
	queue = result.then(() => sleep(1100), () => sleep(1100));

	const data = await result;
	cache.set(url, { at: Date.now(), data });
	return data;
}

function creditString(credits) {
	return (credits || []).map((c) => (c.name || c.artist?.name || '') + (c.joinphrase || '')).join('');
}

function fmtReleased(iso) {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
	if (!m) {
		const y = /^(\d{4})/.exec(iso || '');
		return { year: y ? y[1] : '', released: '', stampDate: '' };
	}
	const [, y, mo, d] = m;
	return {
		year: y,
		released: `${MONTHS[Number(mo) - 1] || ''} ${Number(d)}, ${y}`,
		stampDate: `${mo}·${d}·'${y.slice(2)}`
	};
}

/** Track/album length in ms -> "3:04", or "1:02:47" once past an hour. */
export function fmtLength(ms) {
	if (!ms) return '';
	const total = Math.round(ms / 1000);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const pad = (n) => String(n).padStart(2, '0');
	return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Shape a MusicBrainz release into the flat object every poster consumes. */
function toAlbum(rel, albumId) {
	const artist = creditString(rel['artist-credit']);
	const primary = new Set(
		(rel['artist-credit'] || []).map((c) => (c.name || '').trim().toLowerCase()).filter(Boolean)
	);

	const media = rel.media || [];
	const tracks = [];
	let runtime = 0;
	let n = 0;

	for (const [di, disc] of media.entries()) {
		for (const t of disc.tracks || []) {
			n += 1;
			const len = t.length ?? t.recording?.length ?? 0;
			runtime += len || 0;
			const feats = (t.recording?.['artist-credit'] || [])
				.map((c) => (c.name || '').trim())
				.filter((name) => name && !primary.has(name.toLowerCase()));
			tracks.push({
				n,
				disc: di + 1,
				t: t.title || t.recording?.title || '',
				feat: feats.join(' & '),
				len: len || 0,
				lenStr: fmtLength(len)
			});
		}
	}

	// Prefer the release group's first release date — the specific release we
	// matched may be a reissue, but the poster wants the album's own date.
	const iso = rel['release-group']?.['first-release-date'] || rel.date || '';
	const { year, released, stampDate } = fmtReleased(iso);
	const title = rel.title || '';

	const { deezerId, appleId } = serviceIds(rel);

	return {
		albumId,
		mbid: rel.id,
		releaseGroupId: rel['release-group']?.id || '',
		deezerId,
		appleId,
		artist,
		artistUpper: artist.toUpperCase(),
		title,
		titleUpper: title.toUpperCase(),
		year,
		released,
		stampDate,
		trackCount: tracks.length,
		discCount: media.length,
		runtime,
		runtimeStr: fmtLength(runtime),
		tracks
	};
}

const RELEASE_INC = 'artist-credits+recordings+release-groups+url-rels';

// MusicBrainz stores each release's streaming-service URLs as relationships,
// which turns cover lookup into an exact id join instead of a fuzzy title
// search — the difference between the right cover and some "(English Versión)"
// edition that happened to rank higher.
const DEEZER_RE = /deezer\.com\/(?:[a-z]{2}\/)?album\/(\d+)/i;
const APPLE_RE = /(?:music|itunes)\.apple\.com\/[a-z]{2}\/album\/(?:[^/?#]+\/)?(?:id)?(\d+)/i;

function serviceIds(rel) {
	let deezerId = '';
	let appleId = '';
	for (const r of rel.relations || []) {
		const url = r.url?.resource || '';
		if (!deezerId) deezerId = url.match(DEEZER_RE)?.[1] || '';
		if (!appleId) appleId = url.match(APPLE_RE)?.[1] || '';
	}
	return { deezerId, appleId };
}

/** Look up the MusicBrainz release that carries this Spotify album URL. */
async function releaseIdFromSpotify(albumId) {
	const resource = `https://open.spotify.com/album/${albumId}`;
	const data = await mbFetch(
		`${MB}/url?resource=${encodeURIComponent(resource)}&inc=release-rels&fmt=json`
	);
	const rel = (data?.relations || []).find((r) => r.release?.id);
	return rel?.release?.id || null;
}

/**
 * MusicBrainz often files a group's streaming links on different releases —
 * the Spotify URL on one, the Apple URL on another — so a release matched by
 * its Spotify link can carry no Apple or Deezer id at all. Scan the rest of
 * the group to fill the gaps; without this the artwork cascade falls back to
 * searching by name, which happily returns a different artist's single.
 */
const mediaTrackCount = (rel) =>
	(rel.media || []).reduce((n, m) => n + (m['track-count'] || 0), 0);

async function serviceIdsFromGroup(releaseGroupId, trackCount) {
	if (!releaseGroupId || !trackCount) return { deezerId: '', appleId: '' };
	const data = await mbFetch(
		`${MB}/release?release-group=${releaseGroupId}&inc=url-rels+media&fmt=json&limit=100`
	);
	let deezerId = '';
	let appleId = '';
	for (const rel of data?.releases || []) {
		// Only a sibling with the same number of tracks is the same edition. A
		// deluxe carries different artwork, and MusicBrainz separates the two by
		// disambiguation text rather than title — every Starboy release in the
		// group is titled "Starboy" — so the track count is the reliable signal.
		if (mediaTrackCount(rel) !== trackCount) continue;
		const ids = serviceIds(rel);
		deezerId ||= ids.deezerId;
		appleId ||= ids.appleId;
		if (deezerId && appleId) break;
	}
	return { deezerId, appleId };
}

/** Fill in any service ids the matched release itself doesn't carry. */
async function withGroupServiceIds(album) {
	if (!album || (album.appleId && album.deezerId)) return album;
	const ids = await serviceIdsFromGroup(album.releaseGroupId, album.trackCount);
	album.appleId ||= ids.appleId;
	album.deezerId ||= ids.deezerId;
	return album;
}

async function fetchRelease(mbid) {
	const data = await mbFetch(`${MB}/release/${mbid}?inc=${RELEASE_INC}&fmt=json`);
	return data || null;
}

/** Fallback path: find a release by artist + album name. */
async function releaseIdFromSearch(artist, title) {
	const query = `release:"${title.replace(/"/g, '')}" AND artist:"${artist.replace(/"/g, '')}"`;
	const data = await mbFetch(
		`${MB}/release?query=${encodeURIComponent(query)}&fmt=json&limit=1`
	);
	return data?.releases?.[0]?.id || null;
}

/**
 * Resolve a pasted Spotify album link. Returns the flat album object, or null
 * when MusicBrainz has no release carrying that URL.
 */
export async function albumFromSpotifyLink(albumId) {
	const mbid = await releaseIdFromSpotify(albumId);
	if (!mbid) return null;
	const rel = await fetchRelease(mbid);
	return rel ? withGroupServiceIds(toAlbum(rel, albumId)) : null;
}

/** Resolve by typed artist + album, for links MusicBrainz doesn't know. */
export async function albumFromSearch(artist, title) {
	const mbid = await releaseIdFromSearch(artist, title);
	if (!mbid) return null;
	const rel = await fetchRelease(mbid);
	return rel ? withGroupServiceIds(toAlbum(rel, '')) : null;
}

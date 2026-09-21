// Cover artwork resolution, client-side.
//
// Spotify's largest cover is 640px, which is about two inches at print
// resolution, so artwork comes from three other sources instead. All of them
// send `Access-Control-Allow-Origin: *`, which means the browser fetches covers
// directly and the server never touches them.
//
//   Apple   reliable and square, but its index misses streaming-only releases
//   CAA     occasionally far better (6000px seen), sometimes not even square
//   Deezer  modest ceiling, but catches records Apple's index doesn't carry
//
// None of the three wins often enough to be the default, so candidates are
// measured and the largest valid square wins.
//
// Every source is addressed by id — Apple and Deezer ids come from MusicBrainz
// relationships, CAA by release MBID — because searching by name picks up
// deluxe, remastered and alternate-language editions whose covers differ from
// the record you actually asked for. Name search is a last resort only.

const SQUARE_TOL = 0.02; // CAA "front" images are sometimes gatefolds or obi scans
const MIN_EDGE = 1000; // below this, offer the upload prompt instead

// Cover Art Archive redirects to archive.org, where a full-size original can
// take anywhere from three seconds to several minutes. Nothing may block on it
// indefinitely, so every candidate races a deadline and losers are simply
// dropped from the contest.
const PREVIEW_TIMEOUT = 8000;
const FULL_TIMEOUT = 12000;

// The poster is 600×848 CSS px and exports at pixelRatio 4, so the cover can
// never resolve past 2400 device px. A square candidate at least this big is
// indistinguishable in the output from a larger one, so the contest settles as
// soon as one arrives rather than waiting out a slow source that could only win
// on paper — which is almost always Cover Art Archive holding up the export.
const EXPORT_EDGE = 2400;

const noop = () => {};

const norm = (s) =>
	(s || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '');

/** Score a search hit against the album we want: 2 exact, 1 prefix, 0 no match. */
function titleScore(candidate, wanted) {
	const c = norm(candidate);
	const w = norm(wanted);
	if (!c || !w) return 0;
	if (c === w) return 2;
	return c.startsWith(w) || w.startsWith(c) ? 1 : 0;
}

/**
 * Best name match in a result list, used only when no id is available. The
 * artist must agree: searching a title alone turns up unrelated singles of the
 * same name, and showing a stranger's cover is worse than showing none.
 */
function pickByName(results, getTitle, getArtist, title, artist) {
	let best = null;
	let bestScore = 0;
	for (const r of results) {
		const score = titleScore(getTitle(r), title);
		if (!score || !titleScore(getArtist(r), artist)) continue;
		if (score > bestScore) {
			bestScore = score;
			best = r;
		}
	}
	return best;
}

/** Load an image and report its real dimensions; null on failure or timeout. */
function measure(url, source, timeoutMs = FULL_TIMEOUT) {
	return new Promise((resolve) => {
		if (!url) return resolve(null);
		const img = new Image();
		let settled = false;
		const finish = (value) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve(value);
		};
		const timer = setTimeout(() => {
			img.src = ''; // abort the in-flight fetch
			finish(null);
		}, timeoutMs);
		img.crossOrigin = 'anonymous';
		img.onload = () => finish({ url, source, w: img.naturalWidth, h: img.naturalHeight });
		img.onerror = () => finish(null);
		img.src = url;
	});
}

const isSquare = (c) => !!c && Math.abs(c.w - c.h) / Math.max(c.w, c.h) <= SQUARE_TOL;

// --- Apple -----------------------------------------------------------------
async function appleUrl({ appleId, artist, title }, size) {
	try {
		const endpoint = appleId
			? `https://itunes.apple.com/lookup?id=${encodeURIComponent(appleId)}`
			: `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${title}`)}&entity=album&limit=25`;
		const res = await fetch(endpoint);
		if (!res.ok) return null;
		const { results = [] } = await res.json();
		const best = appleId
			? results.find((r) => r.artworkUrl100)
			: pickByName(results, (r) => r.collectionName, (r) => r.artistName, title, artist);
		if (!best?.artworkUrl100) return null;
		// Requesting a size larger than the master silently clamps to it.
		return best.artworkUrl100.replace('100x100bb', `${size}x${size}bb`);
	} catch {
		return null;
	}
}

// --- Cover Art Archive -----------------------------------------------------
// The release we matched is a specific edition; its own cover is the right one.
// The release group is the fallback, since not every edition has art uploaded.
async function caaMeasure({ mbid, releaseGroupId }, variant, budgetMs) {
	const paths = [
		mbid && `release/${mbid}`,
		releaseGroupId && `release-group/${releaseGroupId}`
	].filter(Boolean);
	// The two attempts share one budget, so a stalled CAA can't cost double.
	const per = Math.floor(budgetMs / Math.max(paths.length, 1));
	for (const path of paths) {
		const c = await measure(`https://coverartarchive.org/${path}/${variant}`, 'caa', per);
		if (c) return c;
	}
	return null;
}

// --- Deezer ----------------------------------------------------------------
// api.deezer.com sends no CORS headers, so lookups are proxied; the image CDN
// does, so the cover itself is still fetched directly.
async function deezerUrl({ deezerId, artist, title }, size) {
	try {
		const query = deezerId
			? `id=${encodeURIComponent(deezerId)}`
			: `q=${encodeURIComponent(`${artist} ${title}`)}`;
		const res = await fetch(`/api/deezer?${query}`);
		if (!res.ok) return null;
		const { results = [] } = await res.json();
		const best = deezerId
			? results.find((r) => r.md5)
			: pickByName(results, (r) => r.title, (r) => r.artist, title, artist);
		if (!best?.md5) return null;
		return `https://e-cdns-images.dzcdn.net/images/cover/${best.md5}/${size}x${size}-000000-80-0-0.jpg`;
	} catch {
		return null;
	}
}

/**
 * Fast first pass for the on-screen poster: small variants, first valid square
 * wins in source order. Good enough to render and to pull a palette from.
 */
export async function previewArtwork(album) {
	// Apple is the usual winner and the quickest to answer, so settle for it
	// alone rather than making every preview wait on Cover Art Archive.
	const apple = await measure(await appleUrl(album, 1400), 'apple', PREVIEW_TIMEOUT);
	if (isSquare(apple)) return apple;

	const [caa, deezer] = await Promise.all([
		caaMeasure(album, 'front-1200', PREVIEW_TIMEOUT),
		deezerUrl(album, 1000).then((u) => measure(u, 'deezer', PREVIEW_TIMEOUT))
	]);
	return [caa, deezer].find(isSquare) || null;
}

/**
 * Full contest, run at export time when resolution actually matters: fetch all
 * three at their maximum, discard anything non-square, keep the largest.
 * Returns { url, source, w, h, lowRes } or null.
 */
export async function bestArtwork(album) {
	const [apple, deezer] = await Promise.all([appleUrl(album, 3000), deezerUrl(album, 1400)]);
	const candidates = [
		measure(apple, 'apple', FULL_TIMEOUT),
		caaMeasure(album, 'front', FULL_TIMEOUT),
		measure(deezer, 'deezer', FULL_TIMEOUT)
	];

	// Settles the moment any candidate clears the export ceiling; if none does,
	// it simply never settles and the full contest below decides instead.
	const goodEnough = new Promise((resolve) => {
		for (const p of candidates) {
			p.then((c) => {
				if (isSquare(c) && c.w >= EXPORT_EDGE) resolve(c);
			}, noop);
		}
	});

	// The original contest: everything that answered, largest square wins.
	const bestOfAll = Promise.all(candidates.map((p) => p.catch(() => null))).then((measured) => {
		const valid = measured.filter(isSquare);
		return valid.length ? valid.reduce((a, b) => (b.w > a.w ? b : a)) : null;
	});

	const winner = await Promise.race([goodEnough, bestOfAll]);
	return winner ? { ...winner, lowRes: winner.w < MIN_EDGE } : null;
}

/** A user-supplied cover always wins; returns the same shape as the others. */
export function uploadedArtwork(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error('Could not read that image.'));
		reader.onload = async () => {
			const c = await measure(String(reader.result), 'upload', FULL_TIMEOUT);
			if (!c) return reject(new Error('That file is not a readable image.'));
			resolve({ ...c, lowRes: c.w < MIN_EDGE });
		};
		reader.readAsDataURL(file);
	});
}

<script>
	import Poster1 from '$lib/posters/Poster1.svelte';
	import Poster2 from '$lib/posters/Poster2.svelte';
	import Poster3 from '$lib/posters/Poster3.svelte';
	import Poster4 from '$lib/posters/Poster4.svelte';
	import Viewer3D from '$lib/Viewer3D.svelte';
	import Editor from '$lib/Editor.svelte';
	import { extractPalette } from '$lib/posters/palette.js';
	import { ROLE_DEFAULTS, googleFamilies } from '$lib/posters/fonts.js';
	import { FRAME_NEUTRAL } from '$lib/posters/util.js';
	import { previewArtwork, bestArtwork, uploadedArtwork } from '$lib/artwork.js';
	import { tick } from 'svelte';

	const STYLES = [
		{ comp: Poster1, no: '01', name: 'Editorial', tag: 'gallery print', text: true },
		{ comp: Poster2, no: '02', name: 'Polaroid', tag: 'taped photo', text: false },
		{ comp: Poster3, no: '03', name: 'Full Bleed', tag: 'cover to the edge', text: true },
		{ comp: Poster4, no: '04', name: 'Vinyl', tag: 'cover as a record', text: true }
	];

	let link = $state('');
	let loading = $state(false);
	let error = $state('');
	let album = $state(null);
	let palette = $state(null);
	let swatches = $state([]); // five dominant cover colours, shared by all posters
	let bgSel = $state([null, null, null, null]); // per-poster chosen background
	let textSel = $state([null, null, null, null]); // per-poster chosen ink
	let fontSel = $state(ROLE_DEFAULTS.map((d) => ({ ...d }))); // per-poster role → font key
	// Per-poster cover framing { zoom, x, y }; see coverTransform in util.js.
	let frameSel = $state(ROLE_DEFAULTS.map(() => ({ ...FRAME_NEUTRAL })));
	// Which layout the editor is on. Full Bleed (index 2) is the default.
	const DEFAULT_LAYOUT = 2;
	let active = $state(DEFAULT_LAYOUT);
	let art = $state(null); // resolved cover { url, w, h, source, lowRes }
	let artFull = $state(false); // true once `art` is the export-grade winner
	let notFound = $state(false); // MusicBrainz has no release for that link
	let fbArtist = $state('');
	let fbTitle = $state('');
	let busy = $state(null); // 'png' | 'pdf' | '3d' | 'share' while working
	let shareMsg = $state(''); // neutral note shown when the browser can't open a share sheet
	let view3d = $state(null); // { src, label } while the 3D viewer is open

	// The editor's live preview doubles as the capture node for every export.
	let captureEl = $state(null);

	const posterData = $derived.by(() => {
		if (!album) return null;
		return {
			...album,
			cover: art?.url || '',
			palette
		};
	});

	function resetRun() {
		error = '';
		album = null;
		palette = null;
		swatches = [];
		bgSel = [null, null, null, null];
		textSel = [null, null, null, null];
		fontSel = ROLE_DEFAULTS.map((d) => ({ ...d }));
		frameSel = ROLE_DEFAULTS.map(() => ({ ...FRAME_NEUTRAL }));
		active = DEFAULT_LAYOUT;
		art = null;
		artFull = false;
		fullArtPromise = null;
		notFound = false;
		shareMsg = '';
	}

	/** Load an album (by Spotify link, or by typed artist + title) and paint it. */
	async function load(query) {
		loading = true;
		resetRun();
		try {
			const res = await fetch('/api/album?' + query);
			const body = await res.json();
			if (!res.ok) {
				if (res.status === 404) notFound = true;
				throw new Error(body?.message || 'Something went wrong.');
			}
			const a = body.album;

			// Artwork is resolved browser-side; the preview pass is small and fast,
			// and the full-resolution contest runs later, at export time.
			const preview = await previewArtwork(a);

			// Pull the cover's palette before showing the posters so Croma's
			// background is ready on first paint (best-effort — neutral fallback).
			let pal = null;
			if (preview) {
				try {
					pal = await extractPalette(preview.url);
				} catch {
					pal = null;
				}
			}
			album = a;
			art = preview;
			palette = pal;
			if (pal) {
				swatches = pal.swatches;
				// STYLES order is [Poster1..4] → [p1..p4].
				bgSel = [pal.p1.bg, pal.p2.bg, pal.p3.bg, pal.p4.bg];
				textSel = [pal.p1.text, pal.p2.text, pal.p3.text, pal.p4.text];
			}
			// Posters are on screen now; get the export-grade cover and the embedded
			// fonts ready in the background while the user looks at them.
			warmExport();
		} catch (e) {
			// The not-found case has its own inline prompt; don't also shout in the
			// error banner.
			if (!notFound) error = e?.message || 'Could not generate posters.';
		} finally {
			loading = false;
		}
	}

	function generate() {
		const q = link.trim();
		if (!q) return;
		return load('link=' + encodeURIComponent(q));
	}

	function generateFallback() {
		if (!fbArtist.trim() || !fbTitle.trim()) return;
		return load(
			'artist=' + encodeURIComponent(fbArtist.trim()) + '&title=' + encodeURIComponent(fbTitle.trim())
		);
	}

	/** Swap in a cover the user supplied; it outranks all three services. */
	async function useUpload(e) {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			art = await uploadedArtwork(file);
			artFull = true;
			palette = await extractPalette(art.url).catch(() => null);
			if (palette) {
				swatches = palette.swatches;
				bgSel = [palette.p1.bg, palette.p2.bg, palette.p3.bg, palette.p4.bg];
				textSel = [palette.p1.text, palette.p2.text, palette.p3.text, palette.p4.text];
			}
		} catch (err) {
			error = err?.message || 'Could not use that image.';
		}
	}

	/** Resolve to the highest-resolution square cover before any capture. Held as
	 * a promise so a background warm-up and a user's Export click share one run
	 * rather than racing two contests. */
	let fullArtPromise = null;
	function ensureFullArt() {
		if (artFull || !album) return Promise.resolve();
		fullArtPromise ??= (async () => {
			const forAlbum = album;
			const best = await bestArtwork(forAlbum);
			// The contest runs in the background, so by the time it lands the user
			// may have uploaded their own cover (which outranks it) or searched for
			// a different record. Either way this result is stale — drop it.
			if (best && !artFull && album === forAlbum) {
				art = best;
				await tick();
				await new Promise((res) => {
					const img = new Image();
					img.crossOrigin = 'anonymous';
					img.onload = img.onerror = () => res();
					img.src = best.url;
				});
			}
			// Only settle the flag for the record this run was started for; a newer
			// search has already reset it and owns its own run.
			if (album === forAlbum) artFull = true;
		})();
		return fullArtPromise;
	}

	function slug() {
		return (album?.title || 'album')
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	// Inlined-woff2 CSS, fetched once per set of families and reused for every
	// export. Only the faces a poster actually draws with are embedded — the
	// whole menu is ~2MB of base64 and every capture bakes it into the SVG.
	const fontCssCache = new Map();
	function getFontCss(families) {
		const key = [...families].sort().join(',');
		if (!fontCssCache.has(key)) {
			fontCssCache.set(
				key,
				fetch('/api/fonts?families=' + encodeURIComponent(key)).then((r) => r.text())
			);
		}
		return fontCssCache.get(key);
	}

	async function rasterizeNode(node, pixelRatio = 2, families = []) {
		if (!node) return null;
		// Every capture path (PNG, PDF, 3D, share) funnels through here, so this is
		// the one place that needs to guarantee the export-grade cover is in place.
		await ensureFullArt();
		const [{ toPng }, fontEmbedCSS] = await Promise.all([
			import('html-to-image'),
			getFontCss(families)
		]);
		// The node is displayed at scale(0.6) in the grid; capture it at full
		// 600×848 (transform reset) on an opaque backdrop so the texture fills
		// the whole frame — otherwise the unfilled area is transparent → black
		// in the 3D slab.
		return toPng(node, {
			pixelRatio,
			// html-to-image's resource cache strips the query string when keying,
			// which would collide across covers whose URLs differ only there.
			// This keeps the keys distinct; `cacheBust` is deliberately NOT set,
			// since it defeats the cache outright and makes every capture re-fetch
			// and re-base64 the full-size cover (measured: 15.6s vs 0.3s).
			includeQueryParams: true,
			width: 600,
			height: 848,
			backgroundColor: '#ffffff',
			style: { transform: 'none', transformOrigin: 'top left', margin: '0' },
			fontEmbedCSS
		});
	}

	// The editor's preview is CSS-scaled to fit the stage; rasterizeNode resets
	// the transform and captures the full 600×848.
	const rasterize = (pixelRatio = 2) =>
		rasterizeNode(captureEl, pixelRatio, googleFamilies(ROLE_DEFAULTS[active], fontSel[active]));

	/** Resolve the export-grade cover and the embedded fonts while the user is
	 * still looking at the posters, so clicking Export or 3D doesn't wait on
	 * either. Best-effort: a failure here just means the click pays for it. */
	function warmExport() {
		ensureFullArt().catch(() => {});
		// Warm each poster's own family set — the same cache keys rasterize() asks
		// for. They collapse to one request while the posters share defaults.
		for (const [i, sel] of fontSel.entries()) {
			getFontCss(googleFamilies(ROLE_DEFAULTS[i], sel)).catch(() => {});
		}
	}

	async function open3D() {
		busy = '3d';
		try {
			const src = await rasterize(2);
			if (src) view3d = { src, label: STYLES[active].name };
		} catch (e) {
			error = '3D view failed: ' + (e?.message || e);
		} finally {
			busy = null;
		}
	}

	async function exportPoster(kind) {
		if (!captureEl) return;
		busy = kind;
		try {
			const dataUrl = await rasterize(4);
			const name = `${slug()}-${STYLES[active].name.toLowerCase().replace(/\s+/g, '-')}`;
			if (kind === 'png') {
				const a = document.createElement('a');
				a.href = dataUrl;
				a.download = `${name}.png`;
				a.click();
			} else {
				const { default: jsPDF } = await import('jspdf');
				const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
				pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297);
				pdf.save(`${name}.pdf`);
			}
		} catch (e) {
			error = 'Export failed: ' + (e?.message || e);
		} finally {
			busy = null;
		}
	}

	// Instagram Stories are a 1080×1920 (9:16) frame; the poster is ~5:7, so we
	// centre it on a Story-sized canvas filled with the poster's own background
	// colour (with a soft shadow so it lifts off the backdrop) and hand back a
	// PNG blob ready for the native share sheet.
	function composeStory(posterUrl, bgColor) {
		return new Promise((resolve, reject) => {
			const W = 1080;
			const H = 1920;
			const canvas = document.createElement('canvas');
			canvas.width = W;
			canvas.height = H;
			const ctx = canvas.getContext('2d');
			ctx.fillStyle = bgColor || '#1a1a17';
			ctx.fillRect(0, 0, W, H);
			const img = new Image();
			img.onload = () => {
				// Fit the poster inside the frame with a margin, preserving its ratio.
				const margin = 110;
				const maxW = W - margin * 2;
				const maxH = H - margin * 2;
				const ar = img.width / img.height;
				let w = maxW;
				let h = w / ar;
				if (h > maxH) {
					h = maxH;
					w = h * ar;
				}
				const x = (W - w) / 2;
				const y = (H - h) / 2;
				ctx.save();
				ctx.shadowColor = 'rgba(0,0,0,0.35)';
				ctx.shadowBlur = 48;
				ctx.shadowOffsetY = 22;
				ctx.drawImage(img, x, y, w, h);
				ctx.restore();
				canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('compose failed'))), 'image/png');
			};
			img.onerror = () => reject(new Error('could not load poster image'));
			img.src = posterUrl;
		});
	}

	// Share a poster as an Instagram-Story-shaped image via the native share sheet.
	// On phones this surfaces Instagram → Stories; on macOS Safari it surfaces
	// AirDrop / Messages / Mail. Browsers without file sharing (Chrome/Edge on
	// desktop) get a note pointing at Export instead.
	async function sharePoster() {
		if (!captureEl) return;
		busy = 'share';
		shareMsg = '';
		try {
			const posterUrl = await rasterize(3);
			const bg = bgSel[active] || posterData.palette?.['p' + (active + 1)]?.bg || '#1a1a17';
			const blob = await composeStory(posterUrl, bg);
			const name = `${slug()}-${STYLES[active].name.toLowerCase().replace(/\s+/g, '-')}`;
			const file = new File([blob], `${name}-story.png`, { type: 'image/png' });
			const shareData = { files: [file], title: `${album.artist} — ${album.title}` };
			if (navigator.canShare?.(shareData)) {
				await navigator.share(shareData);
			} else {
				shareMsg =
					'Sharing to Instagram Stories works from your phone (and Safari on Mac). This browser can’t open a share sheet — use Export to save the image, then post it from your phone.';
			}
		} catch (e) {
			// AbortError = the user dismissed the share sheet; not worth surfacing.
			if (e?.name !== 'AbortError') error = 'Share failed: ' + (e?.message || e);
		} finally {
			busy = null;
		}
	}

</script>

<svelte:head>
	<title>Sleeve</title>
	<meta
		name="description"
		content="Paste a Spotify album link and generate three print-ready album posters, viewable in 3D."
	/>
</svelte:head>

<nav class="topbar">
	<div class="topbar-inner">
		<a class="brand" href="/">
			<svg class="logo" width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
				<rect x="8" y="3.5" width="13" height="18" rx="1.6" fill="oklch(0.5 0.12 150)" />
				<rect x="4" y="6" width="13" height="18" rx="1.6" fill="#1c1916" />
			</svg>
			<span class="brand-name">Sleeve</span>
		</a>
	</div>
</nav>

<div class="page">
	<div class="grain" aria-hidden="true"></div>

	<header class="masthead">
		<div class="hero-text">
			<h1>Create <em>beautiful</em> posters of your favorite album</h1>
			<p class="lede">
				Paste a Spotify album link. We pull the cover, tracklist and runtime, then generate four A4 poster designs inspired by classic record sleeves.
			</p>
		</div>
	</header>

	<section class="console">
		<label class="field">
			<span class="field-label">Spotify album link</span>
			<input
				type="text"
				placeholder="https://open.spotify.com/album/…"
				bind:value={link}
				onkeydown={(e) => e.key === 'Enter' && generate()}
				spellcheck="false"
				autocomplete="off"
			/>
		</label>
		<button class="go" onclick={generate} disabled={loading || !link.trim()}>
			{loading ? 'Developing…' : 'Generate ▸'}
		</button>
	</section>

	<div class="styleline">
		{#each STYLES as s}
			<span><b>{s.no}</b> {s.name} <i>· {s.tag}</i></span>
		{/each}
	</div>

	{#if error}
		<div class="note error">{error}</div>
	{/if}

	{#if shareMsg}
		<div class="note manual">
			<span>{shareMsg}</span>
			<button class="linkish" onclick={() => (shareMsg = '')}>Dismiss</button>
		</div>
	{/if}

	{#if notFound}
		<div class="note manual">
			<span>MusicBrainz has no release for that link yet — enter the artist and album instead.</span>
			<input type="text" placeholder="Artist" bind:value={fbArtist} autocomplete="off" />
			<input type="text" placeholder="Album" bind:value={fbTitle} autocomplete="off" />
			<button class="linkish" onclick={generateFallback}>Look up</button>
		</div>
	{/if}

	{#if !posterData && !loading}
		<div class="empty">
			<p>No record loaded. Try <button class="linkish" onclick={() => { link = 'https://open.spotify.com/album/5K79FLRUCSysQnVESLcTdb'; generate(); }}>Bad Bunny — Debí Tirar Más Fotos</button>.</p>
		</div>
	{/if}

	<footer class="foot">
		<span>Metadata via <a href="https://musicbrainz.org" target="_blank" rel="noreferrer">MusicBrainz</a> · covers via Cover Art Archive, Apple and Deezer</span>
		<span>Four poster studies after a Claude Design original</span>
	</footer>
</div>

{#if posterData}
	<Editor
		styles={STYLES}
		{active}
		onActive={(i) => (active = i)}
		data={posterData}
		{art}
		{swatches}
		{bgSel}
		{textSel}
		{fontSel}
		{frameSel}
		{busy}
		sharing={busy === 'share'}
		onExport={exportPoster}
		onShare={sharePoster}
		on3D={open3D}
		onNew={resetRun}
		onUpload={useUpload}
		bind:captureEl
	/>
{/if}

{#if view3d}
	<Viewer3D src={view3d.src} label={view3d.label} onClose={() => (view3d = null)} />
{/if}

<style>
	:global(html, body) {
		margin: 0;
		background: #d9d6cf;
		/* The site's sans throughout. Posters set their own font-family on
		   .poster-root, so this never reaches the artwork. */
		font-family: 'Public Sans', sans-serif;
	}
	:global(*) {
		-webkit-font-smoothing: antialiased;
		box-sizing: border-box;
	}
	/* Form controls don't inherit font-family, so without this they fall back to
	   the browser's own sans. The font picker sets its previews inline, which
	   still wins over this. */
	:global(button, input, select, textarea) {
		font-family: inherit;
	}

	/* top menu bar */
	.topbar {
		position: sticky;
		top: 0;
		z-index: 40;
		background: rgba(217, 214, 207, 0.82);
		backdrop-filter: blur(8px);
		border-bottom: 1.5px solid rgba(28, 25, 22, 0.14);
	}
	.topbar-inner {
		max-width: 1080px;
		margin: 0 auto;
		padding: 14px 28px;
		display: flex;
		align-items: center;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: #1c1916;
	}
	.logo {
		display: block;
		flex: none;
	}
	.brand-name {
		font-family: 'Libre Baskerville', serif;
		font-size: 19px;
		line-height: 1;
		letter-spacing: 0.01em;
	}

	.page {
		position: relative;
		min-height: 100vh;
		max-width: 1080px;
		margin: 0 auto;
		padding: 44px 28px 80px;
		color: #1c1916;
	}

	/* faint paper grain */
	.grain {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		opacity: 0.5;
		mix-blend-mode: multiply;
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='0.05'/></svg>");
	}
	.page > * {
		position: relative;
		z-index: 1;
	}

	/* masthead */
	.masthead {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 40px;
		margin-top: 18px;
	}
	.hero-text {
		flex: 1 1 460px;
		max-width: 600px;
	}
  
	h1 {
		font-family: 'Libre Baskerville', serif;
		font-weight: 400;
		font-size: clamp(28px, 3.8vw, 46px);
		line-height: 1;
		letter-spacing: -0.015em;
		margin: 14px 0 0;
	}
	h1 em {
		font-style: italic;
		color: oklch(0.45 0.11 150);
	}
	.lede {
		max-width: 560px;
		margin: 20px 0 0;
		font-size: 16px;
		line-height: 1.55;
		color: #4a463f;
	}
	.lede strong {
		font-weight: 700;
		color: #1c1916;
	}

	/* console / input */
	.console {
		margin-top: 40px;
		display: flex;
		gap: 14px;
		align-items: stretch;
		flex-wrap: wrap;
		background: #f3eee3;
		border: 1.5px solid #1c1916;
		padding: 16px;
		box-shadow: 7px 7px 0 rgba(28, 25, 22, 0.14);
	}
	.field {
		flex: 1 1 360px;
		display: flex;
		flex-direction: column;
		gap: 7px;
	}
	.field-label {
		font-family: 'Public Sans', sans-serif;
		font-size: 13px;
		letter-spacing: 0.02em;
		color: #8a8276;
	}
	.field input {
		font-family: 'Public Sans', sans-serif;
		font-size: 15px;
		padding: 11px 12px;
		border: 1.5px solid rgba(28, 25, 22, 0.25);
		background: #fffdf8;
		color: #1c1916;
		outline: none;
		transition: border-color 0.15s;
	}
	.field input:focus {
		border-color: oklch(0.45 0.11 150);
	}
	.go {
		align-self: flex-end;
		font-family: 'Public Sans', sans-serif;
		font-weight: 700;
		font-size: 15px;
		letter-spacing: 0.02em;
		padding: 12px 26px;
		background: #1c1916;
		color: #f3eee3;
		border: none;
		cursor: pointer;
		transition: transform 0.12s, background 0.15s;
	}
	.go:hover:not(:disabled) {
		background: oklch(0.4 0.11 150);
		transform: translateY(-1px);
	}
	.go:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.styleline {
		margin-top: 16px;
		display: flex;
		flex-wrap: wrap;
		gap: 6px 22px;
		font-family: 'Public Sans', sans-serif;
		font-size: 11px;
		color: #8a8276;
		letter-spacing: 0.02em;
	}
	.styleline b {
		color: oklch(0.45 0.11 150);
	}
	.styleline i {
		font-style: normal;
		opacity: 0.7;
	}

	.note {
		margin-top: 22px;
		padding: 12px 16px;
		font-size: 14px;
		border: 1.5px solid;
	}
	.note.error {
		background: #fbeae6;
		border-color: #d8642a;
		color: #8a3413;
	}
	.note.manual {
		background: #f3eee3;
		border-color: #1c1916;
		display: flex;
		gap: 14px;
		align-items: center;
		flex-wrap: wrap;
	}
	.note.manual input {
		font-family: 'Public Sans', sans-serif;
		padding: 8px 10px;
		border: 1.5px solid rgba(28, 25, 22, 0.3);
		background: #fffdf8;
		font-size: 14px;
		flex: 1 1 200px;
	}

	.empty {
		margin-top: 46px;
		text-align: center;
		color: #8a8276;
		font-size: 15px;
	}
	.linkish {
		font: inherit;
		color: oklch(0.42 0.11 150);
		background: none;
		border: none;
		border-bottom: 1.5px solid currentColor;
		padding: 0;
		cursor: pointer;
	}

	.foot {
		margin-top: 60px;
		padding-top: 18px;
		border-top: 1.5px solid rgba(28, 25, 22, 0.2);
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 8px;
		font-family: 'Public Sans', sans-serif;
		font-size: 10.5px;
		letter-spacing: 0.04em;
		color: #8a8276;
	}
	.foot a {
		color: oklch(0.42 0.11 150);
	}

	@media (max-width: 860px) {
		.masthead {
			flex-direction: column;
			align-items: flex-start;
		}
	}
	@media (max-width: 640px) {
		.go {
			width: 100%;
		}
	}
</style>

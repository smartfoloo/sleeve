<script>
	import Poster1 from '$lib/posters/Poster1.svelte';
	import Poster2 from '$lib/posters/Poster2.svelte';
	import Poster3 from '$lib/posters/Poster3.svelte';
	import Viewer3D from '$lib/Viewer3D.svelte';
	import Slab3D from '$lib/Slab3D.svelte';
	import EditModal from '$lib/EditModal.svelte';
	import { extractPalette } from '$lib/posters/palette.js';
	import { ROLE_DEFAULTS } from '$lib/posters/fonts.js';
	import { onMount, tick } from 'svelte';

	const STYLES = [
		{ comp: Poster1, no: '01', name: 'El Disco', tag: 'editorial / gallery', text: true },
		{ comp: Poster2, no: '02', name: 'Más Fotos', tag: 'analog / film', text: false },
		{ comp: Poster3, no: '03', name: 'Croma', tag: 'colour pulled from cover', text: true }
	];

	let link = $state('');
	let loading = $state(false);
	let error = $state('');
	let album = $state(null);
	let palette = $state(null);
	let swatches = $state([]); // five dominant cover colours, shared by all posters
	let bgSel = $state([null, null, null]); // per-poster chosen background
	let textSel = $state([null, null, null]); // per-poster chosen ink
	let fontSel = $state(ROLE_DEFAULTS.map((d) => ({ ...d }))); // per-poster role → font key
	let editing = $state(null); // index of the poster being edited (modal open)
	let exportMenu = $state(null); // index whose PNG/PDF export menu is open
	let serverStreams = $state(null);
	let kworbMissed = $state(false);
	let manualStreams = $state('');
	let busy = $state(null); // `${i}-png` | `${i}-pdf` | `${i}-3d` while working
	let view3d = $state(null); // { src, label } while the 3D viewer is open

	let nodes = $state([]);

	// Hero showcase: a 3D render of the "Croma" poster for a fixed album.
	const HERO_LINK = 'https://open.spotify.com/album/4g1ZRSobMefqF6nelkgibi'; // Hollywood's Bleeding
	let heroData = $state(null); // poster-shaped data for the hero Poster3
	let heroBg = $state(null);
	let heroText = $state(null);
	let heroPng = $state(null); // rasterised hero poster → 3D texture
	let heroNode = $state(null); // hidden full-size capture node

	function short(n) {
		if (!n) return '';
		if (n >= 1e9) return (+(n / 1e9).toFixed(1) + '').replace(/\.0$/, '') + ' billion';
		if (n >= 1e6) return (+(n / 1e6).toFixed(1) + '').replace(/\.0$/, '') + ' million';
		return n.toLocaleString('en-US');
	}

	const effectiveStreams = $derived.by(() => {
		const manual = Number(manualStreams.replace(/[^0-9]/g, ''));
		if (manual) return { streamsStr: manual.toLocaleString('en-US'), streamsShort: short(manual) };
		return serverStreams;
	});

	const posterData = $derived.by(() => {
		if (!album) return null;
		return {
			...album,
			cover: '/api/cover?u=' + encodeURIComponent(album.cover),
			streamsStr: effectiveStreams?.streamsStr || '',
			streamsShort: effectiveStreams?.streamsShort || '',
			palette
		};
	});

	async function generate() {
		const q = link.trim();
		if (!q) return;
		loading = true;
		error = '';
		album = null;
		palette = null;
		swatches = [];
		bgSel = [null, null, null];
		textSel = [null, null, null];
		fontSel = ROLE_DEFAULTS.map((d) => ({ ...d }));
		editing = null;
		exportMenu = null;
		serverStreams = null;
		kworbMissed = false;
		manualStreams = '';
		try {
			const res = await fetch('/api/album?link=' + encodeURIComponent(q));
			const body = await res.json();
			if (!res.ok) throw new Error(body?.message || 'Something went wrong.');
			// Pull the cover's palette before showing the posters so Croma's
			// background is ready on first paint (best-effort — neutral fallback).
			const a = body.album;
			let pal = null;
			try {
				pal = await extractPalette('/api/cover?u=' + encodeURIComponent(a.cover));
			} catch {
				pal = null;
			}
			album = a;
			palette = pal;
			if (pal) {
				swatches = pal.swatches;
				// STYLES order is [Poster1, Poster2, Poster3] → [p1, p2, p3].
				bgSel = [pal.p1.bg, pal.p2.bg, pal.p3.bg];
				textSel = [pal.p1.text, pal.p2.text, pal.p3.text];
			}
			serverStreams = body.streams;
			kworbMissed = !body.streams;
		} catch (e) {
			error = e?.message || 'Could not generate posters.';
		} finally {
			loading = false;
		}
	}

	function slug() {
		return (album?.title || 'album')
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	let fontCssPromise;
	function getFontCss() {
		// Fetch the inlined-woff2 CSS once; reused for every export.
		fontCssPromise ??= fetch('/api/fonts').then((r) => r.text());
		return fontCssPromise;
	}

	async function rasterizeNode(node, pixelRatio = 2) {
		if (!node) return null;
		const [{ toPng }, fontEmbedCSS] = await Promise.all([import('html-to-image'), getFontCss()]);
		// The node is displayed at scale(0.6) in the grid; capture it at full
		// 600×848 (transform reset) on an opaque backdrop so the texture fills
		// the whole frame — otherwise the unfilled area is transparent → black
		// in the 3D slab.
		return toPng(node, {
			pixelRatio,
			cacheBust: true,
			// html-to-image's resource cache strips the query string when keying,
			// so every album's cover (all served from /api/cover?u=…) would collide
			// and reuse the first album's image. Keep the query in the key.
			includeQueryParams: true,
			width: 600,
			height: 848,
			backgroundColor: '#ffffff',
			style: { transform: 'none', transformOrigin: 'top left', margin: '0' },
			fontEmbedCSS
		});
	}

	// The grid nodes are displayed at scale(0.6); capture at full 600×848.
	const rasterize = (i, pixelRatio = 2) => rasterizeNode(nodes[i], pixelRatio);

	async function open3D(i) {
		busy = `${i}-3d`;
		try {
			const src = await rasterize(i, 2);
			if (src) view3d = { src, label: STYLES[i].name };
		} catch (e) {
			error = '3D view failed: ' + (e?.message || e);
		} finally {
			busy = null;
		}
	}

	async function exportPoster(i, kind) {
		const node = nodes[i];
		if (!node) return;
		busy = `${i}-${kind}`;
		try {
			const dataUrl = await rasterize(i, 2);
			const name = `${slug()}-${STYLES[i].name.toLowerCase().replace(/\s+/g, '-')}`;
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

	onMount(async () => {
		// Build the hero showcase: fetch the album, render Croma offscreen, then
		// rasterise it into the 3D slab. Best-effort — the hero simply stays empty
		// if anything fails (e.g. offline), without affecting the rest of the app.
		try {
			const res = await fetch('/api/album?link=' + encodeURIComponent(HERO_LINK));
			const body = await res.json();
			if (!res.ok) return;
			const a = body.album;
			let pal = null;
			try {
				pal = await extractPalette('/api/cover?u=' + encodeURIComponent(a.cover));
			} catch {
				pal = null;
			}
			heroBg = pal?.p3?.bg ?? null;
			heroText = pal?.p3?.text ?? null;
			heroData = {
				...a,
				cover: '/api/cover?u=' + encodeURIComponent(a.cover),
				streamsStr: body.streams?.streamsStr || '',
				streamsShort: body.streams?.streamsShort || '',
				palette: pal
			};
			await tick();
			if (document.fonts?.ready) await document.fonts.ready.catch(() => {});
			await tick();
			heroPng = await rasterizeNode(heroNode, 2);
		} catch {
			/* leave hero empty */
		}
	});
</script>

<svelte:head>
	<title>Sleeve — beautiful posters of your favorite album</title>
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
			<div class="kicker">SPOTIFY&nbsp;→&nbsp;PRINT&nbsp;·&nbsp;A4 STUDIES</div>
			<h1>Create <em>beautiful</em> posters of your favorite album</h1>
			<p class="lede">
				Paste a Spotify album link. We pull the cover, tracklist and total streams, then generate three different A4 poster designs inspired by classic record sleeves.
			</p>
		</div>
		<div class="hero-art" aria-hidden="true">
			{#if heroPng}
				<Slab3D src={heroPng} />
			{:else}
				<div class="hero-skel"></div>
			{/if}
		</div>
	</header>

	<!-- offscreen full-size render used only to rasterise the hero 3D slab -->
	<div class="offscreen" aria-hidden="true">
		<div class="capture" bind:this={heroNode}>
			{#if heroData}
				<Poster3 data={heroData} bg={heroBg} text={heroText} />
			{/if}
		</div>
	</div>

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

	{#if album && kworbMissed}
		<div class="note manual">
			<span>kworb had no stream total for <b>{album.title}</b> — type or paste it below.</span>
			<input
				type="text"
				placeholder="e.g. 12,035,304,057"
				bind:value={manualStreams}
				inputmode="numeric"
			/>
		</div>
	{/if}

	{#if posterData}
		<div class="meta">
			<span class="dot"></span>
			{album.artist} · {album.title} · {album.trackCount} tracks{album.year
				? ` · ${album.year}`
				: ''}{effectiveStreams ? ` · ${effectiveStreams.streamsStr} streams` : ''}
		</div>

		<section class="grid">
			{#each STYLES as s, i (s.no)}
				<figure class="frame">
					<div class="scaler">
						<div class="capture" bind:this={nodes[i]}>
							<s.comp data={posterData} bg={bgSel[i]} text={textSel[i]} fonts={fontSel[i]} />
						</div>
					</div>
					<!-- hover actions over the poster -->
					<div class="hover">
						{#if exportMenu === i}
							<button onclick={() => { exportPoster(i, 'png'); exportMenu = null; }} disabled={busy !== null}>{busy === `${i}-png` ? '…' : 'PNG'}</button>
							<button onclick={() => { exportPoster(i, 'pdf'); exportMenu = null; }} disabled={busy !== null}>{busy === `${i}-pdf` ? '…' : 'PDF'}</button>
							<button class="ghost" onclick={() => (exportMenu = null)}>← Back</button>
						{:else}
							<button class="accent" onclick={() => (exportMenu = i)} disabled={busy !== null}>Export</button>
							<button onclick={() => (editing = i)} disabled={busy !== null}>Edit</button>
						{/if}
					</div>
					<figcaption>
						<span class="cap-label"><b>{s.no}</b> · {s.name}<i>{s.tag}</i></span>
					</figcaption>
				</figure>
			{/each}
		</section>
	{:else if !loading}
		<div class="empty">
			<p>No record loaded. Try <button class="linkish" onclick={() => { link = 'https://open.spotify.com/album/5K79FLRUCSysQnVESLcTdb'; generate(); }}>Bad Bunny — Debí Tirar Más Fotos</button>.</p>
		</div>
	{/if}

	<footer class="foot">
		<span>Cover &amp; tracklist via Spotify · streams via <a href="https://kworb.net" target="_blank" rel="noreferrer">kworb.net</a></span>
		<span>Three poster studies after a Claude Design original</span>
	</footer>
</div>

{#if editing !== null && posterData}
	<EditModal
		style={STYLES[editing]}
		data={posterData}
		index={editing}
		{swatches}
		{bgSel}
		{textSel}
		{fontSel}
		onExport={(kind) => exportPoster(editing, kind)}
		on3D={() => open3D(editing)}
		onClose={() => (editing = null)}
	/>
{/if}

{#if view3d}
	<Viewer3D src={view3d.src} label={view3d.label} onClose={() => (view3d = null)} />
{/if}

<style>
	:global(html, body) {
		margin: 0;
		background: #d9d6cf;
	}
	:global(*) {
		-webkit-font-smoothing: antialiased;
		box-sizing: border-box;
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
		font-family: 'Instrument Serif', serif;
		font-size: 25px;
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
		font-family: 'Archivo', sans-serif;
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
	.hero-art {
		flex: none;
		width: clamp(280px, 34vw, 400px);
		height: 470px;
	}
	.hero-skel {
		width: 78%;
		height: 100%;
		margin: 0 auto;
		border-radius: 4px;
		background: linear-gradient(110deg, rgba(28, 25, 22, 0.06) 30%, rgba(28, 25, 22, 0.12) 50%, rgba(28, 25, 22, 0.06) 70%);
		background-size: 200% 100%;
		animation: shimmer 1.4s infinite;
	}
	@keyframes shimmer {
		from {
			background-position: 200% 0;
		}
		to {
			background-position: -200% 0;
		}
	}
	/* hidden full-size poster, only used to rasterise the hero slab */
	.offscreen {
		position: fixed;
		left: -100000px;
		top: 0;
		width: 600px;
		height: 848px;
		overflow: hidden;
		pointer-events: none;
		z-index: -1;
	}

	.kicker {
		font-family: 'Space Mono', monospace;
		font-size: 11px;
		letter-spacing: 0.28em;
		color: oklch(0.45 0.1 150);
	}
	h1 {
		font-family: 'Instrument Serif', serif;
		font-weight: 400;
		font-size: clamp(38px, 5.4vw, 66px);
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
		font-family: 'Space Mono', monospace;
		font-size: 10px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: #8a8276;
	}
	.field input {
		font-family: 'Space Mono', monospace;
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
		font-family: 'Archivo', sans-serif;
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
		font-family: 'Space Mono', monospace;
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
		font-family: 'Space Mono', monospace;
		padding: 8px 10px;
		border: 1.5px solid rgba(28, 25, 22, 0.3);
		background: #fffdf8;
		font-size: 14px;
		flex: 1 1 200px;
	}

	.meta {
		margin-top: 30px;
		display: flex;
		align-items: center;
		gap: 10px;
		font-family: 'Space Mono', monospace;
		font-size: 12px;
		letter-spacing: 0.04em;
		color: #4a463f;
		border-top: 1.5px solid #1c1916;
		border-bottom: 1.5px solid rgba(28, 25, 22, 0.15);
		padding: 10px 0;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: oklch(0.55 0.13 152);
		flex: none;
	}

	/* poster grid */
	.grid {
		margin-top: 28px;
		display: flex;
		flex-wrap: wrap;
		gap: 30px;
		justify-content: center;
	}
	.frame {
		margin: 0;
		width: 360px;
		position: relative;
	}
	.scaler {
		position: relative;
		width: 360px;
		height: 508.8px; /* 848 * 0.6 */
		overflow: hidden;
		background: #fff;
		box-shadow: 0 18px 40px -22px rgba(28, 25, 22, 0.6), 0 0 0 1px rgba(28, 25, 22, 0.12);
		cursor: pointer;
	}
	.capture {
		width: 600px;
		height: 848px;
		transform: scale(0.6);
		transform-origin: top left;
	}

	/* hover action overlay — covers only the poster, not the labels below */
	.hover {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		height: 508.8px; /* poster area only (848 * 0.6) */
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		background: rgba(16, 14, 12, 0.44);
		opacity: 0;
		transition: opacity 0.16s;
		pointer-events: none;
		cursor: pointer;
	}
	.frame:hover .hover,
	.hover:focus-within {
		opacity: 1;
		pointer-events: auto;
	}
	.hover button {
		font-family: 'Space Mono', monospace;
		font-size: 12px;
		letter-spacing: 0.06em;
		padding: 10px 18px;
		min-width: 152px;
		border: 1.5px solid #f3eee3;
		background: rgba(243, 238, 227, 0.95);
		color: #1c1916;
		cursor: pointer;
		transition: transform 0.12s, background 0.13s;
	}
	.hover button:hover:not(:disabled) {
		transform: translateY(-1px);
	}
	.hover button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.hover button.accent {
		background: oklch(0.45 0.11 150);
		border-color: oklch(0.45 0.11 150);
		color: #f3eee3;
	}
	.hover button.ghost {
		background: transparent;
		color: #f3eee3;
	}

	figcaption {
		margin-top: 12px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
	}
	.cap-label {
		font-family: 'Space Mono', monospace;
		font-size: 11px;
		letter-spacing: 0.04em;
		color: #4a463f;
	}
	.cap-label b {
		color: oklch(0.45 0.11 150);
	}
	.cap-label i {
		display: block;
		font-style: normal;
		font-size: 9.5px;
		opacity: 0.6;
		margin-top: 2px;
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
		font-family: 'Space Mono', monospace;
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
		.hero-art {
			width: 100%;
			max-width: 360px;
			height: 420px;
			align-self: center;
		}
	}
	@media (max-width: 640px) {
		.go {
			width: 100%;
		}
		.hero-art {
			display: none;
		}
	}
</style>

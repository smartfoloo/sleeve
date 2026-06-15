<script>
	// POSTER 2 — analog / film nostalgia
	import { trackScale, lumOf, withAlpha, autofit } from './util.js';
	import { resolveFonts, ROLE_DEFAULTS } from './fonts.js';
	let { data, bg, fonts } = $props();

	// Per-role fonts (user-chosen), falling back to this design's defaults.
	const f = $derived(resolveFonts(ROLE_DEFAULTS[1], fonts));

	const ink = '#3a3128'; // ink on the inner paper cards (always light) — unchanged
	const stamp = '#d8642a';

	// Only the outer canvas background is user-controllable here (everything
	// readable sits on floating paper photos/notes). Text printed directly on
	// the canvas auto-contrasts so it stays legible on any chosen colour.
	const paper = $derived(bg || data.palette?.p2?.bg || '#efe2cb');
	const onBg = $derived(lumOf(paper) > 0.5 ? '#3a3128' : '#f3e9d6');
	const onBgMuted = $derived(withAlpha(onBg, 0.6));

	const k = $derived(trackScale(data.tracks.length));
	const lh = $derived((1.95 * (0.6 + 0.4 * k)).toFixed(2));
	const half = $derived(Math.ceil(data.tracks.length / 2));
	const colA = $derived(data.tracks.slice(0, half));
	const colB = $derived(data.tracks.slice(half));
	const pad = (n) => String(n).padStart(2, '0');
	// Handwritten caption: lowercase the title but capitalize the first letter.
	const caption = $derived.by(() => {
		const t = (data.title || '').toLowerCase();
		return t.charAt(0).toUpperCase() + t.slice(1);
	});
	const grain =
		"url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='120' height='120' filter='url(%23n)' opacity='0.06'/></svg>\")";
</script>

<div
	class="poster-root"
	style="width:600px;height:848px;position:relative;overflow:hidden;font-family:{f.labels};color:{onBg};background:{paper}"
>
	<!-- paper grain -->
	<div style="position:absolute;inset:0;opacity:0.5;mix-blend-mode:multiply;background-image:{grain}"></div>

	<!-- header stamp row -->
	<div
		style="position:absolute;top:38px;left:44px;right:44px;display:flex;justify-content:space-between;align-items:center"
	>
		<div style="font-family:{f.artist};font-size:10px;letter-spacing:.28em;text-transform:uppercase">{data.artistUpper}</div>
		<div
			style="font-family:{f.labels};font-size:11px;color:{stamp};letter-spacing:.06em;border:1.5px solid {stamp};padding:3px 7px;border-radius:2px"
		>
			{data.stampDate || data.year} ▸
		</div>
	</div>

	<!-- taped photo -->
	<div style="position:absolute;top:86px;left:50%;transform:translateX(-50%) rotate(-2.4deg)">
		<div
			style="position:absolute;top:-13px;left:50%;transform:translateX(-50%) rotate(1.5deg);width:96px;height:26px;background:rgba(214,200,170,0.55);border:1px solid rgba(180,160,120,0.4)"
		></div>
		<div style="background:#fbf7ee;padding:14px 14px 50px;box-shadow:0 16px 30px -14px rgba(58,49,40,0.45);position:relative">
			<img
				src={data.cover}
				alt="cover"
				crossorigin="anonymous"
				style="display:block;width:322px;height:322px;object-fit:cover;filter:sepia(0.18) saturate(1.05) contrast(0.98) brightness(1.02)"
			/>
			<!-- handwritten caption + time stamp, inside the photo's bottom border -->
			<div
				style="position:absolute;left:18px;right:18px;bottom:13px;display:flex;justify-content:space-between;align-items:baseline;gap:12px"
			>
				<span
					style="font-family:{f.title};font-style:italic;font-size:22px;color:{ink};line-height:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
					>{caption}…</span
				>
				<span style="font-family:{f.labels};font-size:12px;color:{stamp};letter-spacing:.04em;flex:none">23·30</span>
			</div>
		</div>
	</div>

	<!-- tracklist on a torn note -->
	<div
		style="position:absolute;top:488px;left:44px;right:44px;bottom:96px;background:#fbf6ea;box-shadow:0 10px 26px -16px rgba(58,49,40,0.5);padding:20px 26px;display:flex;flex-direction:column"
	>
		<div
			style="font-family:{f.labels};font-size:9.5px;letter-spacing:.26em;text-transform:uppercase;color:{stamp};margin-bottom:10px;border-bottom:1px dashed rgba(58,49,40,0.3);padding-bottom:8px"
		>
			SIDE A / SIDE B — {data.trackCount} TRACKS
		</div>
		<div use:autofit={{ deps: [f.tracklist, k, data.tracks.length], bottom: 732 }} style="display:flex;gap:28px">
			<div style="flex:1;min-width:0">
				{#each colA as tr (tr.n)}
					<div style="display:flex;gap:8px;font-family:{f.tracklist};font-size:calc({(11 * k).toFixed(2)}px * var(--fit,1));line-height:{lh};color:{ink}">
						<span style="color:{stamp};flex:none">{pad(tr.n)}</span>
						<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
							>{tr.t}{#if tr.feat}<span style="color:#a89b88"> · {tr.feat}</span>{/if}</span
						>
					</div>
				{/each}
			</div>
			<div style="flex:1;min-width:0">
				{#each colB as tr (tr.n)}
					<div style="display:flex;gap:8px;font-family:{f.tracklist};font-size:calc({(11 * k).toFixed(2)}px * var(--fit,1));line-height:{lh};color:{ink}">
						<span style="color:{stamp};flex:none">{pad(tr.n)}</span>
						<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
							>{tr.t}{#if tr.feat}<span style="color:#a89b88"> · {tr.feat}</span>{/if}</span
						>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- footer total -->
	<div
		style="position:absolute;left:44px;right:44px;bottom:36px;display:flex;justify-content:space-between;align-items:flex-end"
	>
		<div style="font-family:{f.labels};font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:{onBgMuted};line-height:1.6">
			Spotify<br />streams
		</div>
		<div style="font-family:{f.streams};font-size:20px;letter-spacing:.02em;color:{onBg}">{data.streamsStr || '—'}</div>
	</div>
</div>

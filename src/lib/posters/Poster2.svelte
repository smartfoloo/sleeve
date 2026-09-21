<script>
	// POSTER 2 — "POLAROID" · a taped photo on a paper backdrop
	import { trackScale, lumOf, withAlpha, autofit, trackColumns, META_FS, coverTransform, FRAME_NEUTRAL } from './util.js';
	import { resolveFonts, resolveWeights, ROLE_DEFAULTS } from './fonts.js';
	let { data, bg, fonts, frame = FRAME_NEUTRAL } = $props();

	// Per-role fonts (user-chosen), falling back to this design's defaults.
	const f = $derived(resolveFonts(ROLE_DEFAULTS[1], fonts));
	// A font may pin its own weight (Inter is always 200); null keeps the layout's.
	const w = $derived(resolveWeights(ROLE_DEFAULTS[1], fonts));

	const ink = '#3a3128'; // ink on the inner paper cards (always light) — unchanged
	const stamp = '#d8642a';

	// Only the outer canvas background is user-controllable here (everything
	// readable sits on floating paper photos/notes). Text printed directly on
	// the canvas auto-contrasts so it stays legible on any chosen colour.
	const paper = $derived(bg || data.palette?.p2?.bg || '#efe2cb');
	const onBg = $derived(lumOf(paper) > 0.5 ? '#3a3128' : '#f3e9d6');
	const onBgMuted = $derived(withAlpha(onBg, 0.6));

	const k = $derived(trackScale(data.tracks.length));
	// Long albums gain a third column rather than shrinking below META_FS.
	const cols = $derived(trackColumns(data.tracks, data.palette?.mono));
	const colGap = $derived(cols.length > 2 ? 16 : 28);
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
		<div style="font-family:{f.artist};font-weight:{w.artist ?? 400};font-size:{META_FS}px;letter-spacing:.08em">{data.artist}</div>
		<div
			style="font-family:{f.labels};font-weight:{w.labels ?? 400};font-size:{META_FS}px;color:{stamp};letter-spacing:.06em;border:1.5px solid {stamp};padding:3px 7px;border-radius:2px"
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
			<div style="width:322px;height:322px;overflow:hidden;background:{paper}">
				<img
					src={data.cover}
					alt="cover"
					crossorigin="anonymous"
					style="display:block;width:100%;height:100%;object-fit:cover;transform:{coverTransform(frame)};filter:sepia(0.18) saturate(1.05) contrast(0.98) brightness(1.02)"
				/>
			</div>
			<!-- handwritten caption + time stamp, inside the photo's bottom border -->
			<div
				style="position:absolute;left:18px;right:18px;bottom:13px;display:flex;justify-content:space-between;align-items:baseline;gap:12px"
			>
				<span
					style="font-family:{f.title};font-weight:{w.title ?? 400};font-style:italic;font-size:22px;color:{ink};line-height:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
					>{caption}…</span
				>
				{#if data.runtimeStr}
					<span style="font-family:{f.labels};font-weight:{w.labels ?? 400};font-size:{META_FS}px;color:{stamp};letter-spacing:.04em;flex:none">{data.runtimeStr}</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- tracklist on a torn note -->
	<div
		style="position:absolute;top:488px;left:44px;right:44px;bottom:44px;background:#fbf6ea;box-shadow:0 10px 26px -16px rgba(58,49,40,0.5);padding:20px 26px;display:flex;flex-direction:column"
	>
		<div use:autofit={{ deps: [f.tracklist, k, data.tracks.length], bottom: 786 }} style="display:flex;gap:{colGap}px">
			{#each cols as col, ci (ci)}
				<div style="flex:1;min-width:0">
					{#each col as tr (tr.n)}
						<div style="display:flex;gap:8px;font-family:{f.tracklist};font-weight:{w.tracklist ?? 400};font-size:{META_FS}px;line-height:1.3;padding:calc({(3.4 * k).toFixed(2)}px * var(--fit,1)) 0;color:{ink}">
							<span style="color:{stamp};flex:none">{pad(tr.n)}</span>
							<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
								>{tr.t}{#if tr.feat}<span style="color:#a89b88"> · {tr.feat}</span>{/if}</span
							>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</div>

</div>

<script>
	// POSTER 1 — "EDITORIAL" · gallery print
	import { trackScale, titleSize, withAlpha, autofit, trackColumns, META_FS, coverTransform, FRAME_NEUTRAL } from './util.js';
	import { resolveFonts, resolveWeights, fontWidthScale, ROLE_DEFAULTS } from './fonts.js';
	let { data, bg, text, fonts, frame = FRAME_NEUTRAL } = $props();

	// Per-role fonts (user-chosen), falling back to this design's defaults.
	const f = $derived(resolveFonts(ROLE_DEFAULTS[0], fonts));
	// A font may pin its own weight (Inter is always 200); null keeps the layout's.
	const w = $derived(resolveWeights(ROLE_DEFAULTS[0], fonts));

	// Background (paper) + ink come from props (user-chosen), falling back to the
	// auto-detected palette default, then the original editorial scheme. The
	// signature green accent stays fixed; muted/borders derive from the ink.
	const paper = $derived(bg || data.palette?.p1?.bg || '#f3eee3');
	const ink = $derived(text || data.palette?.p1?.text || '#1c1916');
	const green = 'oklch(0.50 0.10 150)';
	const muted = $derived(withAlpha(ink, 0.5));

	// Long albums gain a third column rather than shrinking below META_FS.
	const cols = $derived(trackColumns(data.tracks, data.palette?.mono));
	const colGap = $derived(cols.length > 2 ? 18 : 34);
	const k = $derived(trackScale(data.tracks.length));
	// Title sizes were tuned on Instrument Serif; scale them for whichever
	// face is actually in use so a wider one can't overflow the frame.
	const tScale = $derived(fontWidthScale(ROLE_DEFAULTS[0], fonts));
	const tFs = $derived(titleSize(data.title, Math.round(70 * tScale), Math.round(34 * tScale)));
	const pad = (n) => String(n).padStart(2, '0');
</script>

<div
	class="poster-root"
	style="width:600px;height:848px;background:{paper};color:{ink};position:relative;font-family:{f.labels};padding:44px 46px 44px;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column"
>
	<!-- title -->
	<div
		style="font-family:{f.title};font-weight:{w.title ?? 400};font-style:italic;font-size:{tFs}px;line-height:0.92;letter-spacing:-0.01em;overflow-wrap:anywhere"
	>
		{data.title}
	</div>

	<!-- cover + caption -->
	<div style="display:flex;gap:22px;margin-top:26px;align-items:flex-end">
		<div style="flex:none">
			<div style="padding:6px;background:#fff;box-shadow:0 1px 0 rgba(28,25,22,0.12)">
				<div style="width:248px;height:248px;overflow:hidden;background:{paper}">
					<img
						src={data.cover}
						alt="cover"
						crossorigin="anonymous"
						style="display:block;width:100%;height:100%;object-fit:cover;transform:{coverTransform(frame)};filter:saturate(1.02) contrast(1.02)"
					/>
				</div>
			</div>
		</div>
		<div style="padding-bottom:4px">
			<div
				style="font-family:{f.artist};font-weight:{w.artist ?? 400};font-style:italic;font-size:30px;line-height:1.05;color:{ink}"
			>
				{data.artist}
			</div>
			<!-- release date + runtime share one quiet meta block; the runtime line
			     is dropped entirely when the release has no track durations -->
			<div
				style="font-family:{f.labels};font-weight:{w.labels ?? 400};margin-top:14px;font-size:{META_FS}px;letter-spacing:.04em;color:{muted};line-height:1.7"
			>
				{data.released || '—'}{#if data.runtimeStr}<br />{data.runtimeStr}{/if}
			</div>
		</div>
	</div>

	<!-- tracklist -->
	<div use:autofit={{ deps: [f.tracklist, k, data.tracks.length], bottom: 804 }} style="display:flex;gap:{colGap}px;margin-top:auto;padding-top:26px">
		{#each cols as col, ci (ci)}
			<div style="flex:1;min-width:0">
				{#each col as tr (tr.n)}
					<div style="display:flex;align-items:baseline;gap:10px;padding:calc({(5 * k).toFixed(2)}px * var(--fit,1)) 0">
						<span
							style="font-family:{f.tracklist};font-size:{META_FS}px;font-weight:{w.tracklist ?? 600};color:{green};width:24px;flex:none;letter-spacing:.02em"
							>{pad(tr.n)}</span
						>
						<span
							style="font-family:{f.tracklist};font-size:{META_FS}px;font-weight:{w.tracklist ?? 500};color:{ink};line-height:1.2;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
							>{tr.t}</span
						>
					</div>
				{/each}
			</div>
		{/each}
	</div>
</div>

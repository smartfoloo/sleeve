<script>
	// POSTER 3 — "FULL BLEED" · cover sits flush to the top edge, full square, and
	// fades at its lower edge into a background colour; the tracklist fills what's
	// left. Runtime rides the release-date line, as on Poster 4.
	import { trackScale, titleSize, withAlpha, autofit, trackColumns, META_FS, coverTransform, FRAME_NEUTRAL } from './util.js';
	import { resolveFonts, resolveWeights, fontWidthScale, ROLE_DEFAULTS } from './fonts.js';
	let { data, bg, text, fonts, frame = FRAME_NEUTRAL } = $props();

	// Per-role fonts (user-chosen), falling back to this design's defaults.
	const f = $derived(resolveFonts(ROLE_DEFAULTS[2], fonts));
	// A font may pin its own weight (Inter is always 200); null keeps the layout's.
	const w = $derived(resolveWeights(ROLE_DEFAULTS[2], fonts));

	// Background + ink come from props (user-chosen); fall back to the palette
	// default, then to a neutral scheme so the poster always renders.
	const bgC = $derived(bg || data.palette?.p3?.bg || '#1a1a17');
	const ink = $derived(text || data.palette?.p3?.text || '#f2ecdd');

	const subtext = $derived(withAlpha(ink, 0.66));
	const fade = $derived(
		`linear-gradient(to bottom, ${withAlpha(bgC, 0)} 0%, ${withAlpha(bgC, 0.55)} 55%, ${bgC} 100%)`
	);
	// Long albums gain a third column rather than shrinking below META_FS.
	const cols = $derived(trackColumns(data.tracks, data.palette?.mono));
	const colGap = $derived(cols.length > 2 ? 16 : 26);
	const k = $derived(trackScale(data.tracks.length));
	// Title sizes were tuned on Instrument Serif; scale them for whichever
	// face is actually in use so a wider one can't overflow the frame.
	const tScale = $derived(fontWidthScale(ROLE_DEFAULTS[2], fonts));
	const tFs = $derived(titleSize(data.title, Math.round(52 * tScale), Math.round(26 * tScale)));
</script>

<div
	class="poster-root"
	style="width:600px;height:848px;position:relative;overflow:hidden;box-sizing:border-box;background:{bgC};color:{ink};font-family:{f.labels};display:flex;flex-direction:column"
>
	<!-- cover: flush to the top, full square, fading at its lower edge -->
	<div style="position:relative;flex:none;height:600px">
		<div style="position:absolute;inset:0;overflow:hidden;background:{bgC}">
			<img src={data.cover} alt="cover" crossorigin="anonymous" style="display:block;width:100%;height:100%;object-fit:cover;transform:{coverTransform(frame)}" />
		</div>
		<div style="position:absolute;left:0;right:0;bottom:0;height:240px;background:{fade}"></div>
	</div>

	<!-- content (pulled up slightly into the faded zone) -->
	<div style="flex:1;min-height:0;display:flex;flex-direction:column;padding:0 50px 36px;margin-top:-130px;position:relative;z-index:1">
		<!-- album, artist, date — margin-top:auto pushes the whole block (and the
		     tracklist under it) to the bottom edge, so a short album still sits low -->
		<div style="margin-top:auto;font-family:{f.title};font-weight:{w.title ?? 400};font-size:{tFs}px;line-height:0.94;letter-spacing:-0.01em;overflow-wrap:anywhere;flex:none">{data.title}</div>

		<div
			style="margin-top:16px;font-family:{f.artist};font-weight:{w.artist ?? 400};font-size:{META_FS}px;letter-spacing:.06em;color:{ink};flex:none;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
		>
			{data.artist}
		</div>

		<div
			style="margin-top:14px;font-family:{f.labels};font-weight:{w.labels ?? 400};font-size:{META_FS}px;letter-spacing:.04em;color:{subtext};flex:none;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
		>
			{data.released || '—'}{#if data.runtimeStr}{' · '}{data.runtimeStr}{/if}
		</div>

		<!-- tracklist -->
		<div use:autofit={{ deps: [f.tracklist, k, data.tracks.length], bottom: 806 }} style="display:flex;gap:{colGap}px;margin-top:22px;min-height:0">
			{#each cols as col, ci (ci)}
				<div style="flex:1;min-width:0">
					{#each col as tr (tr.n)}
						<div style="display:flex;align-items:baseline;gap:9px;padding:calc({(3.2 * k).toFixed(2)}px * var(--fit,1)) 0">
							<span style="font-family:{f.tracklist};font-weight:{w.tracklist ?? 400};font-size:{META_FS}px;color:{subtext};width:24px;flex:none">{String(tr.n).padStart(2, '0')}</span>
							<span style="font-family:{f.tracklist};font-weight:{w.tracklist ?? 600};font-size:{META_FS}px;letter-spacing:.01em;line-height:1.2;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{tr.t}</span>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>

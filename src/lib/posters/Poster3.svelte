<script>
	// POSTER 3 — "CROMA" · cover sits flush to the top edge, full square, and
	// fades at its lower edge into a background colour. Total streams float as a
	// small chip over the artwork (no fade); the tracklist fills what's left.
	import { trackScale, titleSize, withAlpha, lumOf, autofit } from './util.js';
	import { resolveFonts, ROLE_DEFAULTS } from './fonts.js';
	let { data, bg, text, fonts } = $props();

	// Per-role fonts (user-chosen), falling back to this design's defaults.
	const f = $derived(resolveFonts(ROLE_DEFAULTS[2], fonts));

	// Background + ink come from props (user-chosen); fall back to the palette
	// default, then to a neutral scheme so the poster always renders.
	const bgC = $derived(bg || data.palette?.p3?.bg || '#1a1a17');
	const ink = $derived(text || data.palette?.p3?.text || '#f2ecdd');

	const subtext = $derived(withAlpha(ink, 0.66));
	const onColor = $derived(withAlpha(ink, 0.16));
	const fade = $derived(
		`linear-gradient(to bottom, ${withAlpha(bgC, 0)} 0%, ${withAlpha(bgC, 0.55)} 55%, ${bgC} 100%)`
	);
	// Chip ink stays legible whatever the artwork behind it: contrast off bg.
	const chipInk = $derived(lumOf(bgC) > 0.5 ? '#16140f' : '#f6f2e8');
	const chipBg = $derived(withAlpha(bgC, 0.82));

	const half = $derived(Math.ceil(data.tracks.length / 2));
	const colA = $derived(data.tracks.slice(0, half));
	const colB = $derived(data.tracks.slice(half));
	const k = $derived(trackScale(data.tracks.length));
	const tFs = $derived(titleSize(data.title, 52, 26));
</script>

<div
	class="poster-root"
	style="width:600px;height:848px;position:relative;overflow:hidden;box-sizing:border-box;background:{bgC};color:{ink};font-family:{f.labels};display:flex;flex-direction:column"
>
	<!-- cover: flush to the top, full square, fading at its lower edge -->
	<div style="position:relative;flex:none;height:600px">
		<img src={data.cover} alt="cover" crossorigin="anonymous" style="display:block;width:100%;height:100%;object-fit:cover" />
		<div style="position:absolute;left:0;right:0;bottom:0;height:240px;background:{fade}"></div>

		<!-- floating streams chip (no fade) -->
		<div
			style="position:absolute;top:22px;right:22px;background:{chipBg};color:{chipInk};padding:9px 13px;display:flex;align-items:baseline;gap:10px;backdrop-filter:blur(2px)"
		>
			<span style="font-family:{f.labels};font-size:7.5px;letter-spacing:.16em;text-transform:uppercase;line-height:1.25;opacity:.7">
				Total<br />Spotify<br />streams
			</span>
			<span style="font-family:{f.streams};font-size:24px;line-height:0.9;letter-spacing:-0.01em;white-space:nowrap">{data.streamsStr || '—'}</span>
		</div>
	</div>

	<!-- content (pulled up slightly into the faded zone) -->
	<div style="flex:1;min-height:0;display:flex;flex-direction:column;padding:0 50px 40px;margin-top:-96px;position:relative;z-index:1">
		<!-- artist / year -->
		<div
			style="display:flex;justify-content:space-between;align-items:baseline;gap:14px;font-family:{f.labels};font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:{subtext}"
		>
			<span style="font-family:{f.artist};color:{ink};min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{data.artistUpper}</span>
			<span style="flex:none">{data.year || '—'}</span>
		</div>

		<!-- title -->
		<div style="font-family:{f.title};font-size:{tFs}px;line-height:0.94;letter-spacing:-0.01em;margin-top:8px;overflow-wrap:anywhere;flex:none">{data.title}</div>

		<!-- meta -->
		<div
			style="display:flex;justify-content:space-between;align-items:baseline;gap:14px;margin-top:10px;font-family:{f.labels};font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:{subtext};flex:none"
		>
			<span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{data.released || data.year || '—'}</span>
			<span style="flex:none">{data.trackCount} tracks</span>
		</div>

		<!-- tracklist -->
		<div use:autofit={{ deps: [f.tracklist, k, data.tracks.length], bottom: 806 }} style="display:flex;gap:26px;margin-top:14px;min-height:0;flex:1">
			<div style="flex:1;min-width:0">
				{#each colA as tr (tr.n)}
					<div style="display:flex;align-items:baseline;gap:9px;padding:calc({(2.6 * k).toFixed(2)}px * var(--fit,1)) 0;border-top:1px solid {onColor}">
						<span style="font-family:{f.tracklist};font-size:calc({(8.5 * k).toFixed(2)}px * var(--fit,1));color:{subtext};width:16px;flex:none">{String(tr.n).padStart(2, '0')}</span>
						<span style="font-family:{f.tracklist};font-weight:600;font-size:calc({(10.5 * k).toFixed(2)}px * var(--fit,1));letter-spacing:.01em;text-transform:uppercase;line-height:1.2;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{tr.t}</span>
					</div>
				{/each}
			</div>
			<div style="flex:1;min-width:0">
				{#each colB as tr (tr.n)}
					<div style="display:flex;align-items:baseline;gap:9px;padding:calc({(2.6 * k).toFixed(2)}px * var(--fit,1)) 0;border-top:1px solid {onColor}">
						<span style="font-family:{f.tracklist};font-size:calc({(8.5 * k).toFixed(2)}px * var(--fit,1));color:{subtext};width:16px;flex:none">{String(tr.n).padStart(2, '0')}</span>
						<span style="font-family:{f.tracklist};font-weight:600;font-size:calc({(10.5 * k).toFixed(2)}px * var(--fit,1));letter-spacing:.01em;text-transform:uppercase;line-height:1.2;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{tr.t}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

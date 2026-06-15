<script>
	// POSTER 1 — "EL DISCO" · editorial / gallery
	import { trackScale, titleSize, withAlpha, autofit } from './util.js';
	import { resolveFonts, ROLE_DEFAULTS } from './fonts.js';
	let { data, bg, text, fonts } = $props();

	// Per-role fonts (user-chosen), falling back to this design's defaults.
	const f = $derived(resolveFonts(ROLE_DEFAULTS[0], fonts));

	// Background (paper) + ink come from props (user-chosen), falling back to the
	// auto-detected palette default, then the original editorial scheme. The
	// signature green accent stays fixed; muted/borders derive from the ink.
	const paper = $derived(bg || data.palette?.p1?.bg || '#f3eee3');
	const ink = $derived(text || data.palette?.p1?.text || '#1c1916');
	const green = 'oklch(0.50 0.10 150)';
	const muted = $derived(withAlpha(ink, 0.5));
	const hair = $derived(withAlpha(ink, 0.1));

	const half = $derived(Math.ceil(data.tracks.length / 2));
	const colA = $derived(data.tracks.slice(0, half));
	const colB = $derived(data.tracks.slice(half));
	const k = $derived(trackScale(data.tracks.length));
	const tFs = $derived(titleSize(data.title, 70, 34));
	const pad = (n) => String(n).padStart(2, '0');
</script>

<div
	class="poster-root"
	style="width:600px;height:848px;background:{paper};color:{ink};position:relative;font-family:{f.labels};padding:44px 46px 0;box-sizing:border-box;overflow:hidden"
>
	<!-- header -->
	<div
		style="display:flex;justify-content:space-between;align-items:baseline;font-family:{f.labels};font-size:10.5px;font-weight:600;letter-spacing:.22em;text-transform:uppercase"
	>
		<span>{data.artistUpper}</span>
		<span style="color:{muted}">LP · {data.year || '—'}</span>
	</div>
	<div style="height:1px;background:{ink};margin:12px 0 22px"></div>

	<!-- title -->
	<div
		style="font-family:{f.title};font-style:italic;font-size:{tFs}px;line-height:0.92;letter-spacing:-0.01em;overflow-wrap:anywhere"
	>
		{data.title}
	</div>

	<!-- cover + caption -->
	<div style="display:flex;gap:22px;margin-top:26px;align-items:flex-end">
		<div style="flex:none">
			<div style="padding:6px;background:#fff;box-shadow:0 1px 0 rgba(28,25,22,0.12)">
				<img
					src={data.cover}
					alt="cover"
					crossorigin="anonymous"
					style="display:block;width:248px;height:248px;object-fit:cover;filter:saturate(1.02) contrast(1.02)"
				/>
			</div>
		</div>
		<div style="padding-bottom:4px">
			<div
				style="font-family:{f.artist};font-style:italic;font-size:30px;line-height:1.05;color:{ink}"
			>
				{data.artist}
			</div>
			<div
				style="font-family:{f.labels};margin-top:14px;font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:{muted};line-height:1.7"
			>
				Released<br />{data.released || '—'}<br />{data.trackCount} Tracks
			</div>
		</div>
	</div>

	<!-- tracklist -->
	<div use:autofit={{ deps: [f.tracklist, k, data.tracks.length], bottom: 744 }} style="display:flex;gap:34px;margin-top:26px">
		<div style="flex:1;min-width:0">
			{#each colA as tr (tr.n)}
				<div
					style="display:flex;align-items:baseline;gap:10px;padding:calc({(5 * k).toFixed(2)}px * var(--fit,1)) 0;border-bottom:1px solid {hair}"
				>
					<span
						style="font-family:{f.tracklist};font-size:calc({(10.5 * k).toFixed(2)}px * var(--fit,1));font-weight:600;color:{green};width:18px;flex:none;letter-spacing:.02em"
						>{pad(tr.n)}</span
					>
					<span
						style="font-family:{f.tracklist};font-size:calc({(11 * k).toFixed(2)}px * var(--fit,1));font-weight:500;color:{ink};text-transform:uppercase;line-height:1.2;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
						>{tr.t}</span
					>
				</div>
			{/each}
		</div>
		<div style="flex:1;min-width:0">
			{#each colB as tr (tr.n)}
				<div
					style="display:flex;align-items:baseline;gap:10px;padding:calc({(5 * k).toFixed(2)}px * var(--fit,1)) 0;border-bottom:1px solid {hair}"
				>
					<span
						style="font-family:{f.tracklist};font-size:calc({(10.5 * k).toFixed(2)}px * var(--fit,1));font-weight:600;color:{green};width:18px;flex:none;letter-spacing:.02em"
						>{pad(tr.n)}</span
					>
					<span
						style="font-family:{f.tracklist};font-size:calc({(11 * k).toFixed(2)}px * var(--fit,1));font-weight:500;color:{ink};text-transform:uppercase;line-height:1.2;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
						>{tr.t}</span
					>
				</div>
			{/each}
		</div>
	</div>

	<!-- stat band -->
	<div
		style="position:absolute;left:0;right:0;bottom:0;height:96px;background:{ink};color:{paper};display:flex;align-items:center;gap:24px;padding:0 46px;box-sizing:border-box"
	>
		<div style="font-family:{f.labels};font-size:10px;letter-spacing:.22em;text-transform:uppercase;line-height:1.5;flex:none">
			Total<br />Spotify<br />Streams
		</div>
		<div
			style="flex:1;min-width:0;text-align:right;font-family:{f.streams};font-size:40px;letter-spacing:-0.01em;line-height:1;white-space:nowrap"
		>
			{data.streamsStr || '—'}
		</div>
	</div>
</div>

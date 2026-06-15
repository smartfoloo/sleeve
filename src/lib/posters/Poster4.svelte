<script>
	// POSTER 4 — "EN VINILO" · the cover becomes the circular label of a black
	// grooved record, a tonearm arcing in from the top-right. Background is a
	// solid palette colour (user-chosen); the disc itself stays black like a
	// real record, lifted off any background by a sheen + drop shadow.
	import { trackScale, titleSize, withAlpha, lumOf, autofit } from './util.js';
	import { resolveFonts, ROLE_DEFAULTS } from './fonts.js';
	let { data, bg, text, fonts } = $props();

	// Per-role fonts (user-chosen), falling back to this design's defaults.
	const f = $derived(resolveFonts(ROLE_DEFAULTS[3], fonts));

	// Solid background + ink from props (user-chosen), then the palette default,
	// then a neutral scheme so the poster always renders.
	const paper = $derived(bg || data.palette?.p4?.bg || '#1a1a17');
	const ink = $derived(text || data.palette?.p4?.text || '#f2ecdd');
	const subtext = $derived(withAlpha(ink, 0.6));
	const hair = $derived(withAlpha(ink, 0.16));
	// Spindle hole picks up the paper colour so it reads as a hole, not a dot.
	const spindle = $derived(lumOf(paper) > 0.5 ? '#e9e6df' : '#cfcabf');

	const half = $derived(Math.ceil(data.tracks.length / 2));
	const colA = $derived(data.tracks.slice(0, half));
	const colB = $derived(data.tracks.slice(half));
	const k = $derived(trackScale(data.tracks.length));
	const tFs = $derived(titleSize(data.title, 56, 30));
	const pad = (n) => String(n).padStart(2, '0');
</script>

<div
	class="poster-root vinyl"
	style="width:600px;height:848px;background:{paper};color:{ink};position:relative;font-family:{f.labels};padding:44px 46px 0;box-sizing:border-box;overflow:hidden"
>
	<!-- header -->
	<div
		style="display:flex;justify-content:space-between;align-items:baseline;font-family:{f.labels};font-size:10.5px;font-weight:600;letter-spacing:.22em;text-transform:uppercase"
	>
		<span style="font-family:{f.artist}">{data.artistUpper}</span>
		<span style="color:{subtext}">33⅓ RPM · {data.year || '—'}</span>
	</div>
	<div style="height:1px;background:{ink};margin:12px 0 14px"></div>

	<!-- title -->
	<div
		style="font-family:{f.title};font-style:italic;font-size:{tFs}px;line-height:0.92;letter-spacing:-0.01em;overflow-wrap:anywhere"
	>
		{data.title}
	</div>

	<!-- record stage -->
	<div class="stage">
		<!-- tonearm: pivot at top-right, arm + headshell resting on the disc -->
		<div class="pivot"></div>
		<div class="tonearm">
			<div class="arm-tube"></div>
			<div class="headshell"></div>
		</div>

		<!-- the record -->
		<div class="disc">
			<div class="label">
				<img src={data.cover} alt="cover" crossorigin="anonymous" />
			</div>
			<div class="spindle" style="background:{spindle}"></div>
		</div>
	</div>

	<!-- tracklist -->
	<div use:autofit={{ deps: [f.tracklist, k, data.tracks.length], bottom: 740 }} style="display:flex;gap:30px;margin-top:18px">
		<div style="flex:1;min-width:0">
			{#each colA as tr (tr.n)}
				<div style="display:flex;align-items:baseline;gap:9px;padding:calc({(3 * k).toFixed(2)}px * var(--fit,1)) 0;border-bottom:1px solid {hair}">
					<span style="font-family:{f.tracklist};font-size:calc({(9 * k).toFixed(2)}px * var(--fit,1));color:{subtext};width:16px;flex:none">{pad(tr.n)}</span>
					<span style="font-family:{f.tracklist};font-weight:600;font-size:calc({(10.5 * k).toFixed(2)}px * var(--fit,1));text-transform:uppercase;line-height:1.2;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{tr.t}</span>
				</div>
			{/each}
		</div>
		<div style="flex:1;min-width:0">
			{#each colB as tr (tr.n)}
				<div style="display:flex;align-items:baseline;gap:9px;padding:calc({(3 * k).toFixed(2)}px * var(--fit,1)) 0;border-bottom:1px solid {hair}">
					<span style="font-family:{f.tracklist};font-size:calc({(9 * k).toFixed(2)}px * var(--fit,1));color:{subtext};width:16px;flex:none">{pad(tr.n)}</span>
					<span style="font-family:{f.tracklist};font-weight:600;font-size:calc({(10.5 * k).toFixed(2)}px * var(--fit,1));text-transform:uppercase;line-height:1.2;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{tr.t}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- stat band -->
	<div
		style="position:absolute;left:0;right:0;bottom:0;height:92px;background:{ink};color:{paper};display:flex;align-items:center;gap:24px;padding:0 46px;box-sizing:border-box"
	>
		<div style="font-family:{f.labels};font-size:10px;letter-spacing:.22em;text-transform:uppercase;line-height:1.5;flex:none">
			Total<br />Spotify<br />Streams
		</div>
		<div style="flex:1;min-width:0;text-align:right;font-family:{f.streams};font-size:40px;letter-spacing:-0.01em;line-height:1;white-space:nowrap">
			{data.streamsStr || '—'}
		</div>
	</div>
</div>

<style>
	/* Record stage: holds the disc (centred) plus the absolutely-placed tonearm. */
	.stage {
		position: relative;
		height: 360px;
		margin-top: 14px;
	}

	/* The black vinyl disc: concentric grooves over a dark radial body, with a
	   soft sheen and drop shadow so it lifts off any background colour. */
	.disc {
		position: absolute;
		left: 50%;
		top: 8px;
		width: 344px;
		height: 344px;
		transform: translateX(-50%);
		border-radius: 50%;
		background:
			repeating-radial-gradient(
				circle at 50% 50%,
				rgba(255, 255, 255, 0.05) 0px,
				rgba(255, 255, 255, 0.05) 1px,
				rgba(0, 0, 0, 0) 2px,
				rgba(0, 0, 0, 0) 4px
			),
			radial-gradient(circle at 50% 36%, #383838 0%, #181818 46%, #0a0a0a 100%);
		box-shadow:
			0 20px 44px rgba(0, 0, 0, 0.45),
			inset 0 0 0 1px rgba(255, 255, 255, 0.07);
		z-index: 1;
	}
	/* Two soft reflective arcs sweeping across the grooves. */
	.disc::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: conic-gradient(
			from 205deg,
			rgba(255, 255, 255, 0.12),
			rgba(255, 255, 255, 0) 42deg,
			rgba(255, 255, 255, 0) 178deg,
			rgba(255, 255, 255, 0.09) 220deg,
			rgba(255, 255, 255, 0) 262deg
		);
		mix-blend-mode: screen;
		pointer-events: none;
	}

	/* The cover, cropped to the round paper label at the disc centre. */
	.label {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 148px;
		height: 148px;
		transform: translate(-50%, -50%);
		border-radius: 50%;
		overflow: hidden;
		z-index: 2;
		box-shadow:
			inset 0 0 0 1px rgba(0, 0, 0, 0.4),
			0 0 0 5px rgba(0, 0, 0, 0.22);
	}
	.label img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	/* Spindle hole punched through the label centre. */
	.spindle {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 9px;
		height: 9px;
		transform: translate(-50%, -50%);
		border-radius: 50%;
		z-index: 3;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.45);
	}

	/* Tonearm pivot anchored near the stage's top-right corner. */
	.pivot {
		position: absolute;
		top: -8px;
		left: 446px;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #f2f2f2, #9c9c9c 65%, #6f6f6f 100%);
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
		z-index: 4;
	}
	/* The arm + headshell, rotated as one so the stylus rests on the disc. */
	.tonearm {
		position: absolute;
		top: 9px;
		left: 463px;
		width: 200px;
		height: 16px;
		transform-origin: left center;
		transform: translateY(-50%) rotate(132deg);
		z-index: 3;
	}
	.arm-tube {
		position: absolute;
		left: 10px;
		right: 26px;
		top: 5px;
		height: 6px;
		border-radius: 3px;
		background: linear-gradient(180deg, #ededed 0%, #b9b9b9 45%, #8c8c8c 100%);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
	}
	.headshell {
		position: absolute;
		right: 0;
		top: 0;
		width: 26px;
		height: 16px;
		border-radius: 3px;
		background: linear-gradient(180deg, #4a4a4a, #1f1f1f);
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.45);
	}
</style>

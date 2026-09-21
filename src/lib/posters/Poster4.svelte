<script>
	// POSTER 4 — "VINYL" · the cover becomes the circular label of a black
	// grooved record, a tonearm arcing in from the top-right. Background is a
	// solid palette colour (user-chosen); the disc itself stays black like a
	// real record, lifted off any background by a sheen + drop shadow.
	import { trackScale, titleSize, withAlpha, lumOf, autofit, trackColumns, META_FS, coverTransform, FRAME_NEUTRAL } from './util.js';
	import { resolveFonts, resolveWeights, fontWidthScale, ROLE_DEFAULTS } from './fonts.js';
	let { data, bg, text, fonts, frame = FRAME_NEUTRAL } = $props();

	// Per-role fonts (user-chosen), falling back to this design's defaults.
	const f = $derived(resolveFonts(ROLE_DEFAULTS[3], fonts));
	// A font may pin its own weight (Inter is always 200); null keeps the layout's.
	const w = $derived(resolveWeights(ROLE_DEFAULTS[3], fonts));

	// Solid background + ink from props (user-chosen), then the palette default,
	// then a neutral scheme so the poster always renders.
	const paper = $derived(bg || data.palette?.p4?.bg || '#1a1a17');
	const ink = $derived(text || data.palette?.p4?.text || '#f2ecdd');
	const subtext = $derived(withAlpha(ink, 0.6));
	// Spindle hole picks up the paper colour so it reads as a hole, not a dot.
	const spindle = $derived(lumOf(paper) > 0.5 ? '#e9e6df' : '#cfcabf');

	// Long albums gain a third column rather than shrinking below META_FS.
	const cols = $derived(trackColumns(data.tracks, data.palette?.mono));
	const colGap = $derived(cols.length > 2 ? 18 : 30);
	const k = $derived(trackScale(data.tracks.length));
	// Title sizes were tuned on Instrument Serif; scale them for whichever
	// face is actually in use so a wider one can't overflow the frame.
	const tScale = $derived(fontWidthScale(ROLE_DEFAULTS[3], fonts));
	const tFs = $derived(titleSize(data.title, Math.round(56 * tScale), Math.round(30 * tScale)));
	const pad = (n) => String(n).padStart(2, '0');
</script>

<div
	class="poster-root vinyl"
	style="width:600px;height:848px;background:{paper};color:{ink};position:relative;font-family:{f.labels};padding:44px 46px 44px;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column"
>
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
			<div class="label" style="background:{paper}">
				<img src={data.cover} alt="cover" crossorigin="anonymous" style="transform:{coverTransform(frame)}" />
			</div>
			<div class="spindle" style="background:{spindle}"></div>
		</div>
	</div>

	<!-- album, artist, date — margin-top:auto pushes this block and the tracklist
	     under it to the bottom edge, so a short album still sits low -->
	<div
		style="margin-top:auto;font-family:{f.title};font-weight:{w.title ?? 400};font-style:italic;font-size:{tFs}px;line-height:0.92;letter-spacing:-0.01em;overflow-wrap:anywhere;flex:none"
	>
		{data.title}
	</div>

	<div
		style="margin-top:16px;font-family:{f.artist};font-weight:{w.artist ?? 400};font-size:{META_FS}px;letter-spacing:.06em;color:{ink};flex:none;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
	>
		{data.artist}
	</div>

	<div
		style="margin-top:14px;font-family:{f.labels};font-weight:{w.labels ?? 400};font-size:{META_FS}px;letter-spacing:.04em;color:{subtext};flex:none"
	>
		{data.released || '—'}{#if data.runtimeStr}{' · '}{data.runtimeStr}{/if}
	</div>

	<!-- tracklist -->
	<div use:autofit={{ deps: [f.tracklist, k, data.tracks.length], bottom: 804 }} style="display:flex;gap:{colGap}px;margin-top:{cols.length > 2 ? 14 : 22}px">
		{#each cols as col, ci (ci)}
			<div style="flex:1;min-width:0">
				{#each col as tr (tr.n)}
					<div style="display:flex;align-items:baseline;gap:9px;padding:calc({(3.6 * k).toFixed(2)}px * var(--fit,1)) 0">
						<span style="font-family:{f.tracklist};font-weight:{w.tracklist ?? 400};font-size:{META_FS}px;color:{subtext};width:24px;flex:none">{pad(tr.n)}</span>
						<span style="font-family:{f.tracklist};font-weight:{w.tracklist ?? 600};font-size:{META_FS}px;line-height:1.2;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{tr.t}</span>
					</div>
				{/each}
			</div>
		{/each}
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

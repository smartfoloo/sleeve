<script>
	// Full-screen poster editor: the whole post-Generate experience. A live
	// preview of the active layout fills the stage, a rail of live thumbnails
	// switches between the four designs, and the right panel holds the per-role
	// font pickers, colour swatches and the export actions.
	//
	// Selections are the shared bgSel/textSel/fontSel arrays, indexed by layout,
	// so each design keeps its own tweaks as you switch between them.
	import { ROLES } from '$lib/posters/fonts.js';
	import { FRAME_NEUTRAL, MIN_ZOOM, MAX_ZOOM } from '$lib/posters/util.js';
	import FontSelect from '$lib/FontSelect.svelte';

	let {
		styles,
		active,
		onActive,
		data,
		art,
		swatches,
		bgSel,
		textSel,
		fontSel,
		frameSel,
		busy,
		sharing,
		onExport,
		onShare,
		on3D,
		onNew,
		onUpload,
		captureEl = $bindable(null)
	} = $props();

	const style = $derived(styles[active]);

	// Text palette: three cover colours + white + black, so white and black are
	// always available. Mirrors `textOptions` in palette.js (keep in sync).
	const textSwatches = $derived([...swatches.slice(0, 3), '#ffffff', '#000000']);

	// The poster is authored at a fixed 600×848; scale it to whatever room the
	// stage actually has rather than guessing a size per breakpoint.
	let stage = $state(null);
	let scale = $state(0.5);
	$effect(() => {
		if (!stage) return;
		const ro = new ResizeObserver(([e]) => {
			const { width, height } = e.contentRect;
			if (width > 0 && height > 0) scale = Math.min(width / 600, height / 848);
		});
		ro.observe(stage);
		return () => ro.disconnect();
	});

	// --- cover reframing -----------------------------------------------------
	// Framing is per layout, so each design keeps its own zoom and pan.
	const frame = $derived(frameSel[active]);
	const SNAP_PX = 7; // how close to centred, on screen, before it snaps
	const ZOOM_SNAP = 0.03; // pull the slider onto exactly 1 near "fills frame"

	let reframing = $state(false);
	let coverBox = $state(null); // the cover's frame, relative to the stage
	let snapX = $state(false); // centred horizontally → show the vertical guide
	let snapY = $state(false);

	// The clipping wrapper around the cover is the frame; the <img> itself
	// carries the zoom transform, so its own rect would be the zoomed size.
	function measureCover() {
		const el = stage?.querySelector('img[alt="cover"]')?.parentElement;
		if (!el) {
			coverBox = null;
			return;
		}
		const s = stage.getBoundingClientRect();
		const r = el.getBoundingClientRect();
		coverBox = { left: r.left - s.left, top: r.top - s.top, width: r.width, height: r.height };
	}

	$effect(() => {
		// Re-measure whenever the layout, the preview scale or the mode changes.
		void active;
		void scale;
		if (!reframing || !stage) {
			coverBox = null;
			return;
		}
		const id = requestAnimationFrame(measureCover);
		return () => cancelAnimationFrame(id);
	});

	// How far the image can travel from centre, in screen px, at this zoom —
	// hidden overflow when zoomed in, slack inside the frame when zoomed out.
	const slack = $derived(Math.abs(frame.zoom - 1) / 2);
	const travel = $derived(
		coverBox ? { x: coverBox.width * slack, y: coverBox.height * slack } : { x: 0, y: 0 }
	);

	let drag = $state(null); // reactive so the grabbing cursor tracks the drag
	function onDown(e) {
		if (!coverBox) return;
		e.preventDefault();
		e.currentTarget.setPointerCapture?.(e.pointerId);
		drag = { px: e.clientX, py: e.clientY, x: frame.x, y: frame.y };
	}
	function onMove(e) {
		if (!drag || !coverBox) return;
		// Pan is stored normalized (±1 = an edge reaches the frame), so the drag
		// is converted through the travel available at this zoom. That also
		// clamps it: there is no way to expose a gap.
		let x = travel.x > 0 ? drag.x + (e.clientX - drag.px) / travel.x : 0;
		let y = travel.y > 0 ? drag.y + (e.clientY - drag.py) / travel.y : 0;
		x = Math.max(-1, Math.min(1, x));
		y = Math.max(-1, Math.min(1, y));
		snapX = travel.x > 0 && Math.abs(x * travel.x) < SNAP_PX;
		snapY = travel.y > 0 && Math.abs(y * travel.y) < SNAP_PX;
		if (snapX) x = 0;
		if (snapY) y = 0;
		frameSel[active] = { ...frame, x, y };
	}
	function onUp(e) {
		drag = null;
		snapX = false;
		snapY = false;
		e.currentTarget.releasePointerCapture?.(e.pointerId);
	}

	// Snap onto exactly 1 near "fills the frame" — a stray 0.99 would otherwise
	// leave a hairline of background that reads as a rendering fault.
	const setZoom = (z) => {
		const zoom = Math.abs(z - 1) < ZOOM_SNAP ? 1 : z;
		frameSel[active] = { ...frame, zoom };
	};
	const resetFrame = () => (frameSel[active] = { ...FRAME_NEUTRAL });
	const framed = $derived(frame.zoom !== 1 || frame.x !== 0 || frame.y !== 0);
</script>

<div class="editor">
	<div class="ed-bar">
		<button class="ed-back" onclick={onNew}>← New album</button>
		<span class="ed-title">{data.artist} · <b>{data.title}</b></span>
		<span class="ed-sub">
			{data.trackCount} tracks{data.year ? ` · ${data.year}` : ''}{data.runtimeStr
				? ` · ${data.runtimeStr}`
				: ''}{art ? ` · cover ${art.w}px via ${art.source}` : ''}
		</span>
	</div>

	<div class="ed-body">
		<div class="ed-main">
			<!-- live preview of the active layout; this is also the capture node -->
			<div class="ed-stage" bind:this={stage}>
				<div
					class="pv-scaler"
					style="width:{600 * scale}px;height:{848 * scale}px"
				>
					<div
						class="pv-capture"
						bind:this={captureEl}
						style="transform:scale({scale})"
					>
						<style.comp
							{data}
							bg={bgSel[active]}
							text={textSel[active]}
							fonts={fontSel[active]}
							frame={frameSel[active]}
						/>
					</div>
				</div>

				<!-- reframe overlay: sits exactly over the cover's frame, dims the
				     rest of the poster, and turns drags into pan -->
				{#if reframing && coverBox}
					<div
						class="rf"
						class:dragging={!!drag}
						style="left:{coverBox.left}px;top:{coverBox.top}px;width:{coverBox.width}px;height:{coverBox.height}px"
						onpointerdown={onDown}
						onpointermove={onMove}
						onpointerup={onUp}
						onpointercancel={onUp}
						role="presentation"
					>
						{#if snapX}<span class="gd v"></span>{/if}
						{#if snapY}<span class="gd h"></span>{/if}
					</div>
				{/if}
			</div>

			<!-- layout picker: live minis of all four designs, stacked beside the
			     poster so the stage keeps the full height of the window -->
			<div class="ed-rail" role="tablist" aria-label="Layout" aria-orientation="vertical">
				{#each styles as s, i (s.no)}
					<button
						class="th"
						class:on={i === active}
						role="tab"
						aria-selected={i === active}
						title="{s.no} {s.name} · {s.tag}"
						onclick={() => onActive(i)}
					>
						<span class="th-scaler">
							<span class="th-capture">
								<s.comp {data} bg={bgSel[i]} text={textSel[i]} fonts={fontSel[i]} frame={frameSel[i]} />
							</span>
						</span>
						<span class="th-cap"><b>{s.no}</b> {s.name}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="ed-panel">
			<div class="ed-group">
				<h4>Fonts</h4>
				{#each ROLES as r}
					<div class="ed-row">
						<span class="ed-label">{r.label}</span>
						<FontSelect
							value={fontSel[active][r.key]}
							onChange={(k) => (fontSel[active][r.key] = k)}
						/>
					</div>
				{/each}
			</div>

			<div class="ed-group">
				<h4>Colours</h4>
				<div class="ed-swrow">
					<span class="ed-label">Background</span>
					<span class="ed-sws">
						{#each swatches as sw}
							<button
								class="ed-sw"
								class:on={bgSel[active] === sw}
								style="background:{sw}"
								title={sw}
								aria-label="Background {sw}"
								onclick={() => (bgSel[active] = sw)}
							></button>
						{/each}
					</span>
				</div>
				{#if style.text}
					<div class="ed-swrow">
						<span class="ed-label">Text</span>
						<span class="ed-sws">
							{#each textSwatches as sw}
								<button
									class="ed-sw"
									class:on={textSel[active] === sw}
									style="background:{sw}"
									title={sw}
									aria-label="Text {sw}"
									onclick={() => (textSel[active] = sw)}
								></button>
							{/each}
						</span>
					</div>
				{:else}
					<p class="ed-note">
						This design's text sits on floating paper, so only the background recolours.
					</p>
				{/if}
			</div>

			<div class="ed-group">
				<h4>Cover</h4>

				{#if reframing}
					<div class="ed-row">
						<span class="ed-label">Zoom</span>
						<input
							class="ed-range"
							type="range"
							min={MIN_ZOOM}
							max={MAX_ZOOM}
							step="0.01"
							value={frame.zoom}
							oninput={(e) => setZoom(+e.currentTarget.value)}
							aria-label="Cover zoom"
						/>
						<span class="ed-num">{frame.zoom.toFixed(2)}×</span>
					</div>
					<p class="ed-note">
						{#if frame.zoom === 1}
							At 1× the cover fills the frame. Zoom in to crop it, or out to inset it on the
							background colour.
						{:else if frame.zoom < 1}
							Drag to reposition. The background colour fills the space around the cover.
						{:else}
							Drag the cover to reposition it. It snaps when centred.
						{/if}
					</p>
					<div class="ed-inline">
						<button class="ed-btn ghost sm" onclick={resetFrame} disabled={!framed}>Reset</button>
						<button class="ed-btn sm" onclick={() => (reframing = false)}>Done</button>
					</div>
				{:else}
					<div class="ed-inline">
						<button class="ed-btn ghost sm" onclick={() => (reframing = true)}>Reframe cover</button>
						{#if framed}<span class="ed-num">{frame.zoom.toFixed(2)}×</span>{/if}
					</div>
				{/if}

				{#if !art || art.lowRes}
					<p class="ed-note">
						{art
							? `Best cover found is only ${art.w}×${art.h} — fine on screen, soft in print.`
							: 'No square cover found for this release.'}
						Upload your own for a sharper poster.
					</p>
					<input class="ed-file" type="file" accept="image/*" onchange={onUpload} />
				{/if}
			</div>

			<div class="ed-actions">
				<button class="ed-btn ghost" onclick={on3D} disabled={busy !== null}>
					{busy === '3d' ? 'Rendering…' : 'Preview in 3D'}
				</button>
				<button class="ed-btn" onclick={() => onExport('png')} disabled={busy !== null}>
					{busy === 'png' ? 'Exporting…' : 'Export PNG'}
				</button>
				<button class="ed-btn" onclick={() => onExport('pdf')} disabled={busy !== null}>
					{busy === 'pdf' ? 'Exporting…' : 'Export PDF'}
				</button>
				<button class="ed-btn share" onclick={onShare} disabled={busy !== null}>
					{sharing ? 'Sharing…' : 'Share to Stories'}
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.editor {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: flex;
		flex-direction: column;
		background: #efe9dc;
		color: #1c1916;
	}

	/* top bar */
	.ed-bar {
		flex: none;
		display: flex;
		align-items: baseline;
		gap: 16px;
		padding: 12px 18px;
		border-bottom: 1.5px solid #1c1916;
		background: #f3eee3;
		font-family: 'Public Sans', sans-serif;
		font-size: 13px;
		letter-spacing: 0.02em;
	}
	.ed-back {
		flex: none;
		font-family: 'Public Sans', sans-serif;
		font-size: 13px;
		letter-spacing: 0.02em;
		padding: 6px 12px;
		border: 1.5px solid #1c1916;
		background: transparent;
		color: #1c1916;
		cursor: pointer;
	}
	.ed-back:hover {
		background: #1c1916;
		color: #f3eee3;
	}
	.ed-title {
		flex: none;
	}
	.ed-title b {
		font-weight: 600;
	}
	.ed-sub {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: #8a8276;
		font-size: 12px;
	}

	/* body */
	.ed-body {
		flex: 1;
		min-height: 0;
		display: flex;
		gap: 0;
	}
	.ed-main {
		flex: 1;
		min-width: 0;
		min-height: 0;
		display: flex;
		padding: 20px;
		gap: 18px;
	}
	.ed-stage {
		flex: 1;
		min-width: 0;
		min-height: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden; /* contains the reframe scrim */
	}

	/* reframe overlay */
	.rf {
		position: absolute;
		z-index: 2;
		cursor: grab;
		touch-action: none;
		outline: 1.5px solid rgba(243, 238, 227, 0.9);
		/* dims everything outside the cover, clipped by the stage */
		box-shadow: 0 0 0 9999px rgba(20, 18, 16, 0.5);
	}
	.rf.dragging {
		cursor: grabbing;
	}
	.gd {
		position: absolute;
		background: oklch(0.72 0.17 150);
		pointer-events: none;
	}
	.gd.v {
		left: 50%;
		top: 0;
		bottom: 0;
		width: 1px;
		transform: translateX(-0.5px);
	}
	.gd.h {
		top: 50%;
		left: 0;
		right: 0;
		height: 1px;
		transform: translateY(-0.5px);
	}
	.pv-scaler {
		overflow: hidden;
		background: #fff;
		box-shadow:
			0 24px 50px -26px rgba(28, 25, 22, 0.65),
			0 0 0 1px rgba(28, 25, 22, 0.12);
	}
	.pv-capture {
		width: 600px;
		height: 848px;
		transform-origin: top left;
	}

	/* layout rail — a vertical column to the right of the poster */
	.ed-rail {
		flex: none;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 14px;
		overflow: auto;
		padding: 2px;
	}
	.th {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
	}
	.th-scaler {
		display: block;
		width: 84px;
		height: 118.72px; /* 848 * 0.14 */
		overflow: hidden;
		background: #fff;
		box-shadow: 0 0 0 1.5px rgba(28, 25, 22, 0.22);
		transition: box-shadow 0.13s;
	}
	.th:hover .th-scaler {
		box-shadow: 0 0 0 1.5px rgba(28, 25, 22, 0.55);
	}
	.th.on .th-scaler {
		box-shadow:
			0 0 0 2px #efe9dc,
			0 0 0 3.5px oklch(0.45 0.11 150);
	}
	.th-capture {
		display: block;
		width: 600px;
		height: 848px;
		transform: scale(0.14);
		transform-origin: top left;
		pointer-events: none;
	}
	.th-cap {
		font-family: 'Public Sans', sans-serif;
		font-size: 11px;
		letter-spacing: 0.02em;
		color: #8a8276;
	}
	.th.on .th-cap {
		color: #1c1916;
	}
	.th-cap b {
		color: oklch(0.45 0.11 150);
	}

	/* right panel */
	.ed-panel {
		flex: none;
		width: 320px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 20px;
		border-left: 1.5px solid #1c1916;
		background: #f3eee3;
		overflow: auto;
	}
	.ed-group h4 {
		margin: 0 0 10px;
		font-family: 'Public Sans', sans-serif;
		font-size: 13px;
		letter-spacing: 0.02em;
		color: #8a8276;
	}
	.ed-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 9px;
	}
	.ed-label {
		font-family: 'Public Sans', sans-serif;
		font-size: 11px;
		letter-spacing: 0.04em;
		color: #4a463f;
		flex: none;
	}
	.ed-swrow {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 10px;
	}
	.ed-sws {
		display: flex;
		gap: 7px;
	}
	.ed-sw {
		width: 24px;
		height: 24px;
		padding: 0;
		border: 1.5px solid rgba(28, 25, 22, 0.25);
		border-radius: 50%;
		cursor: pointer;
		transition: transform 0.1s;
	}
	.ed-sw:hover {
		transform: scale(1.12);
	}
	.ed-sw.on {
		border-color: #1c1916;
		box-shadow:
			0 0 0 2px #f3eee3,
			0 0 0 3.5px #1c1916;
	}
	.ed-note {
		margin: 0;
		font-size: 11.5px;
		line-height: 1.5;
		color: #8a8276;
	}
	.ed-file {
		margin-top: 8px;
		font-size: 11px;
		width: 100%;
	}
	.ed-range {
		flex: 1;
		min-width: 0;
		accent-color: oklch(0.45 0.11 150);
	}
	.ed-num {
		font-family: 'Public Sans', sans-serif;
		font-size: 11px;
		color: #8a8276;
		flex: none;
		min-width: 38px;
		text-align: right;
	}
	.ed-inline {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 10px;
	}
	.ed-btn.sm {
		font-size: 10px;
		padding: 7px 11px;
	}

	.ed-actions {
		margin-top: auto;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding-top: 6px;
	}
	.ed-btn {
		font-family: 'Public Sans', sans-serif;
		font-size: 11px;
		letter-spacing: 0.06em;
		padding: 9px 14px;
		border: 1.5px solid #1c1916;
		background: #1c1916;
		color: #f3eee3;
		cursor: pointer;
		transition:
			background 0.13s,
			transform 0.12s;
	}
	.ed-btn:hover:not(:disabled) {
		background: oklch(0.4 0.11 150);
		border-color: oklch(0.4 0.11 150);
	}
	.ed-btn:disabled {
		opacity: 0.55;
		cursor: default;
	}
	.ed-btn.ghost {
		background: transparent;
		color: oklch(0.4 0.11 150);
		border-color: oklch(0.45 0.11 150);
	}
	.ed-btn.ghost:hover:not(:disabled) {
		background: oklch(0.45 0.11 150);
		color: #f3eee3;
	}
	.ed-btn.share {
		background: linear-gradient(45deg, #f09433, #dc2743 45%, #bc1888 75%, #cc2366);
		border-color: transparent;
		color: #fff;
	}
	.ed-btn.share:hover:not(:disabled) {
		filter: brightness(1.08);
		background: linear-gradient(45deg, #f09433, #dc2743 45%, #bc1888 75%, #cc2366);
		border-color: transparent;
	}

	/* narrow screens: stack the panel under the preview */
	@media (max-width: 900px) {
		.ed-body {
			flex-direction: column;
			overflow: auto;
		}
		.ed-main {
			flex: none;
			height: 72vh;
		}
		.ed-panel {
			width: auto;
			border-left: none;
			border-top: 1.5px solid #1c1916;
			overflow: visible;
		}
		.ed-sub {
			display: none;
		}
	}
</style>

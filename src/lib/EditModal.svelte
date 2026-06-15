<script>
	// Full-screen edit overlay: live poster preview on the left, per-role font
	// pickers + colour swatches on the right, plus Export and Preview-in-3D.
	// It mutates the shared selection state (bgSel/textSel/fontSel) by index, so
	// the grid poster behind it stays in sync.
	import { ROLES } from '$lib/posters/fonts.js';
	import FontSelect from '$lib/FontSelect.svelte';
	let { style, data, index, swatches, bgSel, textSel, fontSel, onExport, on3D, onClose } = $props();

	// Text palette: three cover colours + white + black, so white and black are
	// always available. Mirrors `textOptions` in palette.js (keep in sync).
	const textSwatches = $derived([...swatches.slice(0, 3), '#ffffff', '#000000']);

	function onKey(e) {
		if (e.key === 'Escape') onClose?.();
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="ed-backdrop" onclick={onClose} role="presentation">
	<div class="ed-stage" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Edit poster">
		<div class="ed-bar">
			<span class="ed-title">Edit · <b>{style.no}</b> {style.name}</span>
			<button class="ed-x" onclick={onClose} aria-label="Close">✕</button>
		</div>

		<div class="ed-body">
			<!-- live preview -->
			<div class="ed-preview">
				<div class="ed-scaler">
					<div class="ed-capture">
						<style.comp {data} bg={bgSel[index]} text={textSel[index]} fonts={fontSel[index]} />
					</div>
				</div>
			</div>

			<!-- controls -->
			<div class="ed-panel">
				<div class="ed-group">
					<h4>Fonts</h4>
					{#each ROLES as r}
						<div class="ed-row">
							<span class="ed-label">{r.label}</span>
							<FontSelect value={fontSel[index][r.key]} onChange={(k) => (fontSel[index][r.key] = k)} />
						</div>
					{/each}
				</div>

				<div class="ed-group">
					<h4>Colours</h4>
					<div class="ed-swrow">
						<span class="ed-label">Background</span>
						<span class="ed-sws">
							{#each swatches as sw}
								<button class="ed-sw" class:on={bgSel[index] === sw} style="background:{sw}" title={sw} aria-label="Background {sw}" onclick={() => (bgSel[index] = sw)}></button>
							{/each}
						</span>
					</div>
					{#if style.text}
						<div class="ed-swrow">
							<span class="ed-label">Text</span>
							<span class="ed-sws">
								{#each textSwatches as sw}
									<button class="ed-sw" class:on={textSel[index] === sw} style="background:{sw}" title={sw} aria-label="Text {sw}" onclick={() => (textSel[index] = sw)}></button>
								{/each}
							</span>
						</div>
					{:else}
						<p class="ed-note">This design's text sits on floating paper, so only the background recolours.</p>
					{/if}
				</div>

				<div class="ed-actions">
					<button class="ed-btn ghost" onclick={on3D}>Preview in 3D</button>
					<button class="ed-btn" onclick={() => onExport('png')}>Export PNG</button>
					<button class="ed-btn" onclick={() => onExport('pdf')}>Export PDF</button>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.ed-backdrop {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: rgba(16, 14, 12, 0.84);
		backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}
	.ed-stage {
		width: min(940px, 96vw);
		max-height: 92vh;
		background: #f3eee3;
		border: 1.5px solid #1c1916;
		box-shadow: 0 40px 90px -30px rgba(0, 0, 0, 0.8);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.ed-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		border-bottom: 1.5px solid #1c1916;
		font-family: 'Space Mono', monospace;
		font-size: 12px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #1c1916;
	}
	.ed-bar b {
		color: oklch(0.45 0.11 150);
	}
	.ed-x {
		background: none;
		border: 1px solid rgba(28, 25, 22, 0.3);
		color: #1c1916;
		width: 26px;
		height: 26px;
		cursor: pointer;
		font-size: 12px;
		line-height: 1;
	}
	.ed-x:hover {
		background: rgba(28, 25, 22, 0.1);
	}
	.ed-body {
		display: flex;
		gap: 22px;
		padding: 22px;
		min-height: 0;
		overflow: auto;
	}
	.ed-preview {
		flex: none;
	}
	.ed-scaler {
		width: 360px;
		height: 508.8px;
		overflow: hidden;
		background: #fff;
		box-shadow: 0 18px 40px -22px rgba(28, 25, 22, 0.6), 0 0 0 1px rgba(28, 25, 22, 0.12);
	}
	.ed-capture {
		width: 600px;
		height: 848px;
		transform: scale(0.6);
		transform-origin: top left;
	}
	.ed-panel {
		flex: 1 1 320px;
		min-width: 280px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.ed-group h4 {
		margin: 0 0 10px;
		font-family: 'Space Mono', monospace;
		font-size: 10px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
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
		font-family: 'Space Mono', monospace;
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
		box-shadow: 0 0 0 2px #f3eee3, 0 0 0 3.5px #1c1916;
	}
	.ed-note {
		margin: 0;
		font-size: 11.5px;
		line-height: 1.5;
		color: #8a8276;
	}
	.ed-actions {
		margin-top: auto;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding-top: 6px;
	}
	.ed-btn {
		font-family: 'Space Mono', monospace;
		font-size: 11px;
		letter-spacing: 0.06em;
		padding: 9px 14px;
		border: 1.5px solid #1c1916;
		background: #1c1916;
		color: #f3eee3;
		cursor: pointer;
		transition: background 0.13s, transform 0.12s;
	}
	.ed-btn:hover {
		background: oklch(0.4 0.11 150);
		border-color: oklch(0.4 0.11 150);
	}
	.ed-btn.ghost {
		background: transparent;
		color: oklch(0.4 0.11 150);
		border-color: oklch(0.45 0.11 150);
	}
	.ed-btn.ghost:hover {
		background: oklch(0.45 0.11 150);
		color: #f3eee3;
	}

	@media (max-width: 720px) {
		.ed-body {
			flex-direction: column;
			align-items: center;
		}
	}
</style>

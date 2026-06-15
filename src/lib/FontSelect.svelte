<script>
	// Custom dropdown for picking a font. Each row previews in its own typeface.
	import { FONTS, FONT_KEYS } from '$lib/posters/fonts.js';
	let { value, onChange } = $props();
	let open = $state(false);
	let root = $state(null);

	function pick(k) {
		onChange?.(k);
		open = false;
	}
	function onWin(e) {
		if (open && root && !root.contains(e.target)) open = false;
	}
	function onKey(e) {
		if (e.key === 'Escape') open = false;
	}
</script>

<svelte:window onclick={onWin} onkeydown={onKey} />

<div class="fs" bind:this={root}>
	<button type="button" class="fs-btn" class:open onclick={() => (open = !open)} aria-haspopup="listbox" aria-expanded={open}>
		<span class="fs-cur" style="font-family:{FONTS[value]?.stack}">{FONTS[value]?.label || '—'}</span>
		<span class="fs-car" aria-hidden="true">▾</span>
	</button>
	{#if open}
		<ul class="fs-list" role="listbox">
			{#each FONT_KEYS as k}
				<li role="option" aria-selected={k === value}>
					<button type="button" class="fs-opt" class:on={k === value} style="font-family:{FONTS[k].stack}" onclick={() => pick(k)}>
						<span>{FONTS[k].label}</span>
						{#if k === value}<span class="fs-tick" aria-hidden="true">✓</span>{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.fs {
		position: relative;
		flex: 1 1 auto;
		max-width: 200px;
	}
	.fs-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 8px 10px;
		border: 1.5px solid rgba(28, 25, 22, 0.25);
		background: #fffdf8;
		color: #1c1916;
		font-size: 14px;
		cursor: pointer;
		transition: border-color 0.13s;
	}
	.fs-btn:hover,
	.fs-btn.open {
		border-color: oklch(0.45 0.11 150);
	}
	.fs-cur {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.fs-car {
		flex: none;
		font-size: 10px;
		color: #8a8276;
		transition: transform 0.15s;
	}
	.fs-btn.open .fs-car {
		transform: rotate(180deg);
	}
	.fs-list {
		position: absolute;
		z-index: 10;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		margin: 0;
		padding: 4px;
		list-style: none;
		background: #fffdf8;
		border: 1.5px solid #1c1916;
		box-shadow: 0 16px 30px -16px rgba(28, 25, 22, 0.5);
		max-height: 260px;
		overflow: auto;
	}
	.fs-opt {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 8px 9px;
		border: none;
		background: none;
		color: #1c1916;
		font-size: 15px;
		text-align: left;
		cursor: pointer;
	}
	.fs-opt:hover {
		background: rgba(28, 25, 22, 0.07);
	}
	.fs-opt.on {
		background: oklch(0.92 0.04 150);
	}
	.fs-tick {
		flex: none;
		font-size: 11px;
		color: oklch(0.42 0.11 150);
	}
</style>

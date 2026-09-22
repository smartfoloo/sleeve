<script>
	// Shared chrome for standalone text pages (Terms, Privacy): the same
	// topbar/paper styling as the landing page, without any of its app state.
	let { title, updated, children } = $props();
</script>

<svelte:head>
	<title>{title} · Sleeve</title>
</svelte:head>

<nav class="topbar">
	<div class="topbar-inner">
		<a class="brand" href="/">
			<svg class="logo" width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
				<rect x="8" y="3.5" width="13" height="18" rx="1.6" fill="oklch(0.5 0.12 150)" />
				<rect x="4" y="6" width="13" height="18" rx="1.6" fill="#1c1916" />
			</svg>
			<span class="brand-name">Sleeve</span>
		</a>
	</div>
</nav>

<div class="page">
	<div class="grain" aria-hidden="true"></div>
	<a class="back" href="/">← Back to Sleeve</a>
	<article class="doc">
		<h1>{title}</h1>
		<p class="updated">Last updated {updated}</p>
		{@render children()}
	</article>
	<footer class="foot">
		<span><a href="/">Sleeve</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></span>
	</footer>
</div>

<style>
	:global(html, body) {
		margin: 0;
		background: #d9d6cf;
		font-family: 'Public Sans', sans-serif;
	}
	:global(*) {
		-webkit-font-smoothing: antialiased;
		box-sizing: border-box;
	}

	.topbar {
		position: sticky;
		top: 0;
		z-index: 40;
		background: rgba(217, 214, 207, 0.82);
		backdrop-filter: blur(8px);
		border-bottom: 1.5px solid rgba(28, 25, 22, 0.14);
	}
	.topbar-inner {
		max-width: 760px;
		margin: 0 auto;
		padding: 14px 28px;
		display: flex;
		align-items: center;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: #1c1916;
	}
	.logo {
		display: block;
		flex: none;
	}
	.brand-name {
		font-family: 'Libre Baskerville', serif;
		font-size: 19px;
		line-height: 1;
		letter-spacing: 0.01em;
	}

	.page {
		position: relative;
		min-height: 100vh;
		max-width: 760px;
		margin: 0 auto;
		padding: 40px 28px 80px;
		color: #1c1916;
	}
	.page > * {
		position: relative;
		z-index: 1;
	}
	.grain {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		opacity: 0.5;
		mix-blend-mode: multiply;
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='0.05'/></svg>");
	}

	.back {
		display: inline-block;
		margin-bottom: 22px;
		font-size: 13px;
		color: #8a8276;
		text-decoration: none;
	}
	.back:hover {
		color: #1c1916;
	}

	.doc :global(h1) {
		font-family: 'Libre Baskerville', serif;
		font-weight: 400;
		font-size: clamp(28px, 4vw, 38px);
		line-height: 1.1;
		letter-spacing: -0.015em;
		margin: 0 0 6px;
	}
	.doc :global(.updated) {
		margin: 0 0 34px;
		font-size: 13px;
		color: #8a8276;
	}
	.doc :global(h2) {
		font-family: 'Libre Baskerville', serif;
		font-weight: 400;
		font-size: 21px;
		margin: 40px 0 12px;
	}
	.doc :global(p) {
		margin: 0 0 14px;
		font-size: 15px;
		line-height: 1.65;
		color: #35322c;
	}
	.doc :global(ul) {
		margin: 0 0 14px;
		padding-left: 22px;
	}
	.doc :global(li) {
		font-size: 15px;
		line-height: 1.65;
		color: #35322c;
		margin-bottom: 6px;
	}
	.doc :global(a) {
		color: oklch(0.42 0.11 150);
	}
	.doc :global(strong) {
		color: #1c1916;
	}
	.doc :global(.callout) {
		margin: 22px 0;
		padding: 14px 16px;
		background: #f3eee3;
		border: 1.5px solid #1c1916;
		font-size: 14px;
		line-height: 1.6;
	}
	.doc :global(.callout p) {
		margin: 0;
	}

	.foot {
		margin-top: 60px;
		padding-top: 18px;
		border-top: 1.5px solid rgba(28, 25, 22, 0.2);
		font-family: 'Public Sans', sans-serif;
		font-size: 13px;
		letter-spacing: 0.03em;
		color: #8a8276;
	}
	.foot a {
		color: oklch(0.42 0.11 150);
	}
</style>

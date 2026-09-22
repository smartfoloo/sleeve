<script>
	import LegalShell from '$lib/LegalShell.svelte';
</script>

<LegalShell title="Privacy Policy" updated="September 22, 2026">
	<p>
		Sleeve is built to collect as little as possible. There are no accounts, no passwords, no
		advertising, and (as of this writing) no analytics or tracking cookies of any kind. This
		page describes exactly what does and doesn't happen with your data.
	</p>

	<h2>What reaches Sleeve's server</h2>
	<p>
		When you paste a Spotify link, or type an artist and album, that text is sent to Sleeve's
		server so it can look up the release on MusicBrainz and, when needed, search Deezer's
		catalog for a matching edition. That's the extent of it: no account, email, or payment
		details exist to collect, because Sleeve doesn't have any of those features.
	</p>

	<h2>What never reaches Sleeve's server</h2>
	<ul>
		<li><strong>Cover art.</strong> Once metadata comes back, your <strong>browser</strong> fetches
			the album artwork directly from Apple, Deezer and the Cover Art Archive. The images never
			pass through Sleeve's server at all.</li>
		<li><strong>Exported posters.</strong> PNG and PDF exports, and the 3D preview, are all
			rendered locally in your browser and saved straight to your device. Nothing is uploaded.</li>
	</ul>

	<h2>Hosting logs</h2>
	<p>
		Like effectively any web service, Sleeve's hosting provider may keep standard technical logs
		of requests (IP address, timestamp, page requested) for security and operational purposes.
		Sleeve doesn't read these for analytics, and they aren't linked to anything else.
	</p>

	<h2>Cookies &amp; local storage</h2>
	<p>
		Sleeve doesn't set its own cookies. Whatever you're working on (the album you searched, your
		font and colour choices) lives only in your browser's memory for that visit and is gone when
		you close or reload the tab.
	</p>

	<h2>Third parties Sleeve talks to</h2>
	<p>
		Resolving an album involves a small number of outside services, each with their own privacy
		practices:
	</p>
	<ul>
		<li><a href="https://metabrainz.org/privacy" target="_blank" rel="noreferrer">MusicBrainz</a>: album metadata</li>
		<li><a href="https://archive.org/about/terms.php" target="_blank" rel="noreferrer">Cover Art Archive / Internet Archive</a>: cover images</li>
		<li><a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noreferrer">Apple</a>: cover images, via the public iTunes Search API</li>
		<li><a href="https://www.deezer.com/legal/personal-datas" target="_blank" rel="noreferrer">Deezer</a>: cover images and metadata</li>
	</ul>
	<p>
		Sleeve never sends any request to Spotify; a pasted link is only ever parsed locally for its
		album id.
	</p>

	<h2>Children's privacy</h2>
	<p>Sleeve isn't directed at children under 13, and doesn't knowingly collect data from them.</p>

	<h2>Changes</h2>
	<p>
		If what Sleeve collects ever changes (say, analytics get added later), this page will be
		updated to say so plainly.
	</p>

	<h2>Contact</h2>
	<p>
		Questions about this policy: <a href="https://github.com/smartfoloo/sleeve" target="_blank" rel="noreferrer">github.com/smartfoloo/sleeve</a>.
	</p>
</LegalShell>

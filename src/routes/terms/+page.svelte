<script>
	import LegalShell from '$lib/LegalShell.svelte';
</script>

<LegalShell title="Terms of Service" updated="September 22, 2026">
	<p>
		Sleeve turns a pasted Spotify album link into printable poster designs. These terms cover
		using the site. By using Sleeve, you agree to them.
	</p>

	<h2>What Sleeve is</h2>
	<p>
		Sleeve looks up an album's metadata (title, artist, tracklist, release date, runtime) from
		<a href="https://musicbrainz.org" target="_blank" rel="noreferrer">MusicBrainz</a>, a public,
		CC0-licensed database, then lets your browser fetch cover art directly from Apple, Deezer and
		the <a href="https://coverartarchive.org" target="_blank" rel="noreferrer">Cover Art Archive</a>
		to lay out a poster you can preview, export, or view in 3D.
	</p>
	<p>
		Sleeve is an independent project and is <strong>not affiliated with, endorsed by, or
		sponsored by</strong> Spotify, Apple, Deezer, MusicBrainz, or any artist, label, or rights
		holder whose music or artwork appears on the site. Sleeve never sends requests to Spotify;
		a pasted link is only parsed locally for its album id.
	</p>

	<h2>Copyright &amp; the artwork</h2>
	<p>
		Album covers, titles and track listings belong to their respective artists, labels and
		rights holders. Sleeve does not own them, does not claim any rights to them, and does not
		store or host copies of them on its own servers. That's a deliberate architecture choice:
	</p>
	<ul>
		<li>Cover art is fetched by <strong>your browser</strong>, directly from Apple, Deezer and the
			Cover Art Archive. It never passes through Sleeve's server.</li>
		<li>Poster images and PDFs are rendered and saved <strong>entirely on your device</strong>.
			Sleeve never uploads, stores, or has a copy of anything you export.</li>
	</ul>
	<div class="callout">
		<p>
			Posters are provided for your own <strong>personal, non-commercial</strong> use, things
			like printing one for your wall. You're responsible for making sure any use you put a
			poster to (printing, sharing, reselling, reproducing it elsewhere) complies with copyright
			law and the rights holder's own terms. Sleeve doesn't grant you any license to the
			underlying artwork, and using it doesn't give you any rights beyond what the rights holder
			already allows.
		</p>
	</div>

	<h2>Rights holder requests</h2>
	<p>
		If you're an artist, label or other rights holder and want an image or piece of metadata
		removed or corrected, <a href="https://github.com/smartfoloo/sleeve/issues" target="_blank" rel="noreferrer">open an issue on GitHub</a>
		describing the album and what you'd like changed. Because Sleeve doesn't store artwork, most
		requests are actually about the metadata source (MusicBrainz) or the image source (Apple,
		Deezer, Cover Art Archive) directly. We'll point you the right way if so, and otherwise
		respond promptly.
	</p>

	<h2>Acceptable use</h2>
	<p>You agree not to:</p>
	<ul>
		<li>Use Sleeve to scrape, bulk-download, or systematically harvest metadata or artwork;</li>
		<li>Attempt to disrupt, overload, or circumvent rate limits on Sleeve or the services it
			queries (MusicBrainz, Deezer, Apple, Cover Art Archive);</li>
		<li>Use Sleeve for any unlawful purpose, or to infringe anyone's intellectual property or
			other rights.</li>
	</ul>

	<h2>No warranty</h2>
	<p>
		Sleeve is provided <strong>"as is,"</strong> without warranty of any kind. Metadata and
		artwork come from third-party sources and may be incomplete, mismatched or wrong. We do
		what we reasonably can to resolve the correct release, but don't guarantee accuracy.
		Availability of the site, and of the third-party services it depends on, isn't guaranteed.
	</p>

	<h2>Limitation of liability</h2>
	<p>
		To the fullest extent permitted by law, Sleeve and its operator aren't liable for any
		indirect, incidental, or consequential damages arising from your use of the site, including
		anything arising from artwork, metadata, or exported posters.
	</p>

	<h2>Changes</h2>
	<p>
		These terms may be updated as the site changes. Continued use after an update means you
		accept the revised terms.
	</p>

	<h2>Contact</h2>
	<p>
		Questions about these terms: <a href="https://github.com/smartfoloo/sleeve" target="_blank" rel="noreferrer">github.com/smartfoloo/sleeve</a>.
	</p>
</LegalShell>

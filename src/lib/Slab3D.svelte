<script>
	// Inline, transparent 3D poster slab for the hero. The rasterised poster PNG
	// (`src`) is mapped onto a thin printed slab that gently sways and tilts
	// toward the pointer. three.js is imported lazily so it never weighs on the
	// app shell.
	let { src } = $props();

	let host = $state(null);

	$effect(() => {
		if (!host || !src) return;
		let disposed = false;
		let renderer, raf, ro, slab;
		let targetX = 0;
		let targetY = 0;

		(async () => {
			const THREE = await import('three');
			if (disposed) return;

			const w = host.clientWidth || 360;
			const h = host.clientHeight || 460;

			const scene = new THREE.Scene();
			const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 100);

			renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
			renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
			renderer.setSize(w, h);
			renderer.setClearColor(0x000000, 0);
			host.appendChild(renderer.domElement);
			renderer.domElement.style.display = 'block';

			// Poster slab — 600×848 aspect with a little print thickness.
			const aspect = 848 / 600;
			const pw = 4.1;
			const ph = pw * aspect;
			const depth = 0.08;

			const tex = await new Promise((res) => new THREE.TextureLoader().load(src, res));
			tex.colorSpace = THREE.SRGBColorSpace;
			tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

			const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.0 });
			const edge = new THREE.MeshStandardMaterial({ color: 0xefe9dd, roughness: 0.9 });
			const back = new THREE.MeshStandardMaterial({ color: 0xd9d2c4, roughness: 0.95 });
			// BoxGeometry material order: +X,-X,+Y,-Y,+Z(front),-Z(back)
			slab = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, depth), [edge, edge, edge, edge, front, back]);
			scene.add(slab);

			// Frame the whole poster with a margin.
			const vFov = (camera.fov * Math.PI) / 180;
			const fitH = ph / 2 / Math.tan(vFov / 2);
			const fitW = pw / 2 / Math.tan(vFov / 2) / camera.aspect;
			camera.position.set(0, 0, Math.max(fitH, fitW) * 1.12);

			// Lighting
			scene.add(new THREE.AmbientLight(0xffffff, 0.9));
			const key = new THREE.DirectionalLight(0xffffff, 1.45);
			key.position.set(-3, 4, 6);
			scene.add(key);
			const rim = new THREE.DirectionalLight(0xbfd0ff, 0.5);
			rim.position.set(4, 2, -4);
			scene.add(rim);

			const t0 = performance.now();
			const animate = () => {
				raf = requestAnimationFrame(animate);
				const t = (performance.now() - t0) / 1000;
				const swayY = Math.sin(t * 0.55) * 0.34 + targetY;
				const swayX = Math.cos(t * 0.42) * 0.05 + targetX;
				slab.rotation.y += (swayY - slab.rotation.y) * 0.06;
				slab.rotation.x += (swayX - slab.rotation.x) * 0.06;
				renderer.render(scene, camera);
			};
			animate();

			ro = new ResizeObserver(() => {
				if (!host) return;
				const nw = host.clientWidth;
				const nh = host.clientHeight;
				if (!nw || !nh) return;
				camera.aspect = nw / nh;
				camera.updateProjectionMatrix();
				renderer.setSize(nw, nh);
			});
			ro.observe(host);
		})();

		const onMove = (e) => {
			const r = host.getBoundingClientRect();
			const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
			const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
			targetY = nx * 0.45;
			targetX = -ny * 0.22;
		};
		const onLeave = () => {
			targetX = 0;
			targetY = 0;
		};
		host.addEventListener('pointermove', onMove);
		host.addEventListener('pointerleave', onLeave);

		return () => {
			disposed = true;
			cancelAnimationFrame(raf);
			ro?.disconnect();
			host?.removeEventListener('pointermove', onMove);
			host?.removeEventListener('pointerleave', onLeave);
			renderer?.dispose();
			renderer?.domElement?.remove();
		};
	});
</script>

<div class="slab" bind:this={host}></div>

<style>
	.slab {
		width: 100%;
		height: 100%;
		cursor: grab;
	}
</style>

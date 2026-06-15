<script>
	// Orbiting-print 3D viewer: the rasterised poster PNG mapped onto a thin
	// printed slab, soft studio lighting + contact shadow, drag to rotate and
	// scroll to zoom. three.js is imported lazily so it never weighs on the app
	// shell. `src` is a poster dataURL; `onClose` dismisses the overlay.
	let { src, label = '', onClose } = $props();

	let host = $state(null);
	let loading = $state(true);

	$effect(() => {
		if (!host || !src) return;
		let disposed = false;
		let renderer, controls, raf, ro, three;

		(async () => {
			three = await import('three');
			const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
			if (disposed) return;
			const THREE = three;

			const w = host.clientWidth;
			const h = host.clientHeight;

			const scene = new THREE.Scene();

			const camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 100);

			renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
			renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
			renderer.setSize(w, h);
			renderer.shadowMap.enabled = true;
			renderer.shadowMap.type = THREE.PCFSoftShadowMap;
			host.appendChild(renderer.domElement);

			// Poster slab — 600×848 aspect, a little print thickness.
			const aspect = 848 / 600;
			const pw = 4.1;
			const ph = pw * aspect;
			const depth = 0.07;

			const tex = await new Promise((res) => new THREE.TextureLoader().load(src, res));
			tex.colorSpace = THREE.SRGBColorSpace;
			tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

			const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0.0 });
			const edge = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.9 });
			const back = new THREE.MeshStandardMaterial({ color: 0xdcd6c8, roughness: 0.95 });
			// BoxGeometry material order: +X,-X,+Y,-Y,+Z(front),-Z(back)
			const slab = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, depth), [edge, edge, edge, edge, front, back]);
			slab.castShadow = true;
			scene.add(slab);

			// Distance that frames the whole poster (both axes) with a margin.
			const fitDistance = () => {
				const vFov = (camera.fov * Math.PI) / 180;
				const fitH = ph / 2 / Math.tan(vFov / 2);
				const fitW = pw / 2 / Math.tan(vFov / 2) / camera.aspect;
				return Math.max(fitH, fitW) * 1.16;
			};
			camera.position.set(0, 0, fitDistance());

			// Lighting
			scene.add(new THREE.AmbientLight(0xffffff, 0.85));
			const key = new THREE.DirectionalLight(0xffffff, 1.5);
			key.position.set(-3.5, 4.5, 6);
			key.castShadow = true;
			key.shadow.mapSize.set(1024, 1024);
			key.shadow.camera.near = 1;
			key.shadow.camera.far = 30;
			key.shadow.radius = 6;
			scene.add(key);
			const rim = new THREE.DirectionalLight(0xbfd0ff, 0.5);
			rim.position.set(4, 2, -4);
			scene.add(rim);

			// Contact shadow catcher behind/under the slab.
			const ground = new THREE.Mesh(
				new THREE.PlaneGeometry(40, 40),
				new THREE.ShadowMaterial({ opacity: 0.28 })
			);
			ground.position.z = -depth / 2 - 0.02;
			ground.receiveShadow = true;
			scene.add(ground);

			controls = new OrbitControls(camera, renderer.domElement);
			controls.enableDamping = true;
			controls.dampingFactor = 0.08;
			controls.enablePan = false;
			controls.minDistance = 4;
			controls.maxDistance = 20;
			controls.rotateSpeed = 0.9;
			controls.target.set(0, 0, 0);

			loading = false;

			const animate = () => {
				raf = requestAnimationFrame(animate);
				controls.update();
				renderer.render(scene, camera);
			};
			animate();

			ro = new ResizeObserver(() => {
				if (!host) return;
				const nw = host.clientWidth;
				const nh = host.clientHeight;
				camera.aspect = nw / nh;
				camera.updateProjectionMatrix();
				renderer.setSize(nw, nh);
			});
			ro.observe(host);
		})();

		return () => {
			disposed = true;
			cancelAnimationFrame(raf);
			ro?.disconnect();
			controls?.dispose();
			renderer?.dispose();
			renderer?.domElement?.remove();
		};
	});

	function onKey(e) {
		if (e.key === 'Escape') onClose?.();
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="backdrop" onclick={onClose} role="presentation">
	<div class="stage" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="3D poster view">
		<div class="bar">
			<span class="tag">3D · {label}</span>
			<span class="hint">drag to rotate · scroll to zoom</span>
			<button class="x" onclick={onClose} aria-label="Close">✕</button>
		</div>
		<div class="canvas" bind:this={host}>
			{#if loading}<div class="loading">Building scene…</div>{/if}
		</div>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 70; /* above the edit modal (60) so 3D preview opens on top */
		background: rgba(16, 14, 12, 0.82);
		backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 28px;
	}
	.stage {
		width: min(760px, 94vw);
		height: min(88vh, 900px);
		background: radial-gradient(120% 100% at 50% 0%, #2a2722 0%, #16140f 70%);
		border: 1px solid rgba(247, 242, 232, 0.12);
		box-shadow: 0 40px 90px -30px rgba(0, 0, 0, 0.8);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.bar {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 12px 16px;
		border-bottom: 1px solid rgba(247, 242, 232, 0.1);
		color: #f7f2e8;
		font-family: 'Space Mono', monospace;
	}
	.tag {
		font-size: 12px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.hint {
		flex: 1;
		font-size: 10px;
		letter-spacing: 0.08em;
		color: rgba(247, 242, 232, 0.5);
		text-transform: uppercase;
	}
	.x {
		flex: none;
		background: none;
		border: 1px solid rgba(247, 242, 232, 0.25);
		color: #f7f2e8;
		width: 28px;
		height: 28px;
		cursor: pointer;
		font-size: 13px;
		line-height: 1;
		transition: background 0.13s;
	}
	.x:hover {
		background: rgba(247, 242, 232, 0.12);
	}
	.canvas {
		flex: 1;
		position: relative;
		cursor: grab;
		min-height: 0;
	}
	.canvas:active {
		cursor: grabbing;
	}
	.loading {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(247, 242, 232, 0.6);
		font-family: 'Space Mono', monospace;
		font-size: 12px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
</style>

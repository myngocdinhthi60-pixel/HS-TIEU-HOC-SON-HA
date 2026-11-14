import React, { useEffect, useRef } from 'react';

/**
 * Checks once per mount if WebGL2 runs on software rasterization (SwiftShader/llvmpipe/WARP).
 * Keeps visual fidelity identical while switching to paced afterDraw on software WebGL.
 */
function probeWebGL(): { supported: boolean; isSoftwareGl: boolean } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return { supported: false, isSoftwareGl: true };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

function shouldDisable3D(lowSpec2D: boolean): boolean {
  if (lowSpec2D) return true;
  if (typeof window === 'undefined') return true;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
  return false;
}

/**
 * Transparent Three.js canvas over the Hero tree canopy (right half) rendering
 * a few slow drifting green leaves with subtle mouse parallax.
 * Pauses when off-screen or tab hidden; pointer-events: none; DPR capped at 1.5.
 */
export const HeroLeavesCanvas: React.FC<{ lowSpec2D: boolean }> = ({ lowSpec2D }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (shouldDisable3D(lowSpec2D)) return;
    const probe = probeWebGL();
    if (!probe.supported) return;
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let frameId = 0;
    let inViewport = true;
    let renderer: import('three').WebGLRenderer | null = null;
    const geos: Array<import('three').BufferGeometry> = [];
    const mats: Array<import('three').Material> = [];
    let observer: IntersectionObserver | null = null;
    let cleanupListeners: (() => void) | null = null;

    (async () => {
      const THREE = await import('three');
      if (disposed || !mountRef.current) return;

      const width = Math.max(200, mount.clientWidth || 440);
      const height = Math.max(180, mount.clientHeight || 340);

      renderer = new THREE.WebGLRenderer({
        antialias: !probe.isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(probe.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height);

      mount.innerHTML = '';
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
      camera.position.set(0, 0, 7);

      const keyLight = new THREE.DirectionalLight(0xfffbe6, 1.8);
      keyLight.position.set(3, 5, 4);
      scene.add(keyLight);
      scene.add(new THREE.HemisphereLight(0xe0f7fa, 0x3b7a1f, 1.1));

      // Leaf silhouette shape
      const leafShape = new THREE.Shape();
      leafShape.moveTo(0, -0.22);
      leafShape.quadraticCurveTo(0.16, -0.05, 0.1, 0.14);
      leafShape.quadraticCurveTo(0.03, 0.24, 0, 0.28);
      leafShape.quadraticCurveTo(-0.03, 0.24, -0.1, 0.14);
      leafShape.quadraticCurveTo(-0.16, -0.05, 0, -0.22);

      const leafGeo = new THREE.ExtrudeGeometry(leafShape, {
        depth: 0.018,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
      });
      geos.push(leafGeo);

      const palette = [0x8be93b, 0x67d228, 0xa8f254, 0x57be1f];
      const leafGroup = new THREE.Group();
      scene.add(leafGroup);

      interface LeafItem {
        mesh: import('three').Mesh;
        baseX: number;
        baseY: number;
        speedY: number;
        phase: number;
        rotSpeed: number;
      }

      const leaves: LeafItem[] = [];
      const specs = [
        { x: -1.4, y: 1.55, z: 0.4, scale: 0.72, colorIdx: 0 },
        { x: -0.3, y: 1.75, z: -0.2, scale: 0.65, colorIdx: 1 },
        { x: 0.9, y: 1.65, z: 0.2, scale: 0.78, colorIdx: 2 },
        { x: 1.8, y: 1.4, z: -0.3, scale: 0.68, colorIdx: 3 },
        { x: 0.4, y: 1.3, z: 0.3, scale: 0.58, colorIdx: 2 },
      ];

      specs.forEach((sp, i) => {
        const mat = new THREE.MeshStandardMaterial({
          color: palette[sp.colorIdx],
          roughness: 0.45,
          metalness: 0.05,
        });
        mats.push(mat);
        const mesh = new THREE.Mesh(leafGeo, mat);
        mesh.scale.setScalar(sp.scale);
        mesh.position.set(sp.x, sp.y, sp.z);
        leafGroup.add(mesh);
        leaves.push({
          mesh,
          baseX: sp.x,
          baseY: sp.y,
          speedY: 0.14 + (i % 3) * 0.05,
          phase: i * 1.15,
          rotSpeed: 0.45 + (i % 2) * 0.25,
        });
      });

      let targetParallaxX = 0;
      let targetParallaxY = 0;

      const onPointerMove = (e: PointerEvent) => {
        const rect = mount.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        targetParallaxX = THREE.MathUtils.clamp(nx, -1, 1) * 0.18;
        targetParallaxY = THREE.MathUtils.clamp(-ny, -1, 1) * 0.12;
      };
      window.addEventListener('pointermove', onPointerMove, { passive: true });

      const onResize = () => {
        if (!renderer || !mount) return;
        const w = Math.max(200, mount.clientWidth || 440);
        const h = Math.max(180, mount.clientHeight || 340);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', onResize);

      const afterDraw = (cb: () => void) => {
        if (!renderer) return;
        const gl = renderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      };

      let running = false;
      let elapsed = 0;
      let lastTime = performance.now();

      const scheduleNext = () => {
        if (disposed || !running) return;
        if (probe.isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      };

      const tick = () => {
        if (disposed || !renderer || !running) return;
        if (document.hidden || !inViewport) {
          running = false;
          return;
        }
        const now = performance.now();
        const dt = Math.min(0.08, (now - lastTime) / 1000);
        lastTime = now;
        elapsed += dt;

        leafGroup.position.x = THREE.MathUtils.damp(leafGroup.position.x, targetParallaxX, 4, dt);
        leafGroup.position.y = THREE.MathUtils.damp(leafGroup.position.y, targetParallaxY, 4, dt);

        for (const item of leaves) {
          const cycle = ((elapsed * item.speedY + item.phase) % 2.4) / 2.4; // 0..1 gentle canopy flutter
          item.mesh.position.y = item.baseY - cycle * 0.55 + Math.sin(elapsed * 1.4 + item.phase) * 0.06;
          item.mesh.position.x = item.baseX + Math.sin(elapsed * 1.1 + item.phase) * 0.16;
          item.mesh.rotation.z = Math.sin(elapsed * item.rotSpeed + item.phase) * 0.55;
          item.mesh.rotation.y = Math.cos(elapsed * 0.8 + item.phase) * 0.45;
        }

        renderer.render(scene, camera);
        scheduleNext();
      };

      const startLoop = () => {
        if (disposed || running || document.hidden || !inViewport) return;
        running = true;
        lastTime = performance.now();
        tick();
      };

      const onVisibility = () => {
        if (!document.hidden && inViewport) startLoop();
      };
      document.addEventListener('visibilitychange', onVisibility);

      observer = new IntersectionObserver(
        (entries) => {
          inViewport = entries.some((e) => e.isIntersecting);
          if (inViewport) startLoop();
        },
        { threshold: 0.05 },
      );
      observer.observe(mount);

      startLoop();

      cleanupListeners = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      observer?.disconnect();
      cleanupListeners?.();
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      renderer?.dispose();
    };
  }, [lowSpec2D]);

  return (
    <div
      ref={mountRef}
      data-testid="hero-three-leaves"
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 w-[62%] z-[4] overflow-hidden"
    />
  );
};

/**
 * Transparent Three.js canvas rendered over the Arena trophy area, gently rotating/bobbing
 * two 3D golden star accents when visible in viewport.
 * Falls back cleanly to static artwork if WebGL unavailable or reduced-motion active.
 */
export const ArenaStarsCanvas: React.FC<{ lowSpec2D: boolean }> = ({ lowSpec2D }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (shouldDisable3D(lowSpec2D)) return;
    const probe = probeWebGL();
    if (!probe.supported) return;
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let frameId = 0;
    let inViewport = false;
    let renderer: import('three').WebGLRenderer | null = null;
    const geos: Array<import('three').BufferGeometry> = [];
    const mats: Array<import('three').Material> = [];
    let envTex: import('three').Texture | null = null;
    let observer: IntersectionObserver | null = null;
    let cleanupListeners: (() => void) | null = null;

    (async () => {
      const THREE = await import('three');
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
      if (disposed || !mountRef.current) return;

      const width = Math.max(220, mount.clientWidth || 420);
      const height = Math.max(150, mount.clientHeight || 240);

      renderer = new THREE.WebGLRenderer({
        antialias: !probe.isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(probe.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height);

      mount.innerHTML = '';
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      pmrem.dispose();

      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
      camera.position.set(0, 0, 6);

      const keyLight = new THREE.DirectionalLight(0xfff5d6, 2.2);
      keyLight.position.set(2, 4, 4);
      scene.add(keyLight);
      scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x94a3b8, 1.1));

      // 5-point 3D golden star geometry
      const starShape = new THREE.Shape();
      const outerR = 0.25;
      const innerR = 0.11;
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const px = Math.cos(a) * r;
        const py = -Math.sin(a) * r;
        if (i === 0) starShape.moveTo(px, py);
        else starShape.lineTo(px, py);
      }
      starShape.closePath();

      const starGeo = new THREE.ExtrudeGeometry(starShape, {
        depth: 0.06,
        bevelEnabled: true,
        bevelThickness: 0.025,
        bevelSize: 0.02,
        bevelSegments: 2,
      });
      starGeo.center();
      geos.push(starGeo);

      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xffc81a,
        roughness: 0.24,
        metalness: 0.72,
      });
      mats.push(goldMat);

      // Positioned cleanly in the open outer sky flanks above the two students
      const starLeft = new THREE.Mesh(starGeo, goldMat);
      starLeft.position.set(-1.72, 0.78, 0);
      starLeft.scale.setScalar(0.5);
      scene.add(starLeft);

      const starRight = new THREE.Mesh(starGeo, goldMat);
      starRight.position.set(1.66, 0.82, 0);
      starRight.scale.setScalar(0.46);
      scene.add(starRight);

      const onResize = () => {
        if (!renderer || !mount) return;
        const w = Math.max(220, mount.clientWidth || 420);
        const h = Math.max(150, mount.clientHeight || 240);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', onResize);

      const afterDraw = (cb: () => void) => {
        if (!renderer) return;
        const gl = renderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      };

      let running = false;
      let elapsed = 0;
      let lastTime = performance.now();

      const scheduleNext = () => {
        if (disposed || !running) return;
        if (probe.isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      };

      const tick = () => {
        if (disposed || !renderer || !running) return;
        if (document.hidden || !inViewport) {
          running = false;
          return;
        }
        const now = performance.now();
        const dt = Math.min(0.08, (now - lastTime) / 1000);
        lastTime = now;
        elapsed += dt;

        starLeft.rotation.y = Math.sin(elapsed * 1.4) * 0.55;
        starLeft.rotation.z = Math.cos(elapsed * 1.1) * 0.14;
        starLeft.position.y = 0.78 + Math.sin(elapsed * 2.1) * 0.06;

        starRight.rotation.y = -Math.sin(elapsed * 1.4 + 1.0) * 0.55;
        starRight.rotation.z = -Math.cos(elapsed * 1.1 + 0.8) * 0.14;
        starRight.position.y = 0.82 + Math.sin(elapsed * 2.1 + 1.4) * 0.06;

        renderer.render(scene, camera);
        scheduleNext();
      };

      const startLoop = () => {
        if (disposed || running || document.hidden || !inViewport) return;
        running = true;
        lastTime = performance.now();
        tick();
      };

      const onVisibility = () => {
        if (!document.hidden && inViewport) startLoop();
      };
      document.addEventListener('visibilitychange', onVisibility);

      observer = new IntersectionObserver(
        (entries) => {
          inViewport = entries.some((e) => e.isIntersecting);
          if (inViewport) startLoop();
        },
        { threshold: 0.1 },
      );
      observer.observe(mount);

      cleanupListeners = () => {
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      observer?.disconnect();
      cleanupListeners?.();
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      envTex?.dispose();
      renderer?.dispose();
    };
  }, [lowSpec2D]);

  return (
    <div
      ref={mountRef}
      data-testid="arena-three-stars"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5]"
    />
  );
};

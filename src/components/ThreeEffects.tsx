import React, { useEffect, useRef, useState } from 'react';
import { Award, Copy, Folder } from 'lucide-react';

interface ThreeBadgeProps {
  mode: 'badge' | 'copy_split';
  title: string;
  subtitle?: string;
  lowSpec2D: boolean;
}

/**
 * Checks once per mount if WebGL2 runs on a software rasterizer (SwiftShader/llvmpipe/WARP).
 * Keeps identical 3D geometry/lights while tuning pixelRatio, shadows, and afterDraw pacing.
 */
function detectSoftwareGl(): { supported: boolean; isSoftwareGl: boolean } {
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

export const ThreeRewardOrVisual: React.FC<ThreeBadgeProps> = ({
  mode,
  title,
  subtitle,
  lowSpec2D,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fallback2D, setFallback2D] = useState<boolean>(() => {
    if (lowSpec2D) return true;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (lowSpec2D) {
      setFallback2D(true);
      return;
    }
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setFallback2D(true);
      return;
    }
    const probe = detectSoftwareGl();
    if (!probe.supported) {
      setFallback2D(true);
      return;
    }
    setFallback2D(false);

    const mount = containerRef.current;
    if (!mount) return;

    let disposed = false;
    let frameId = 0;
    let renderer: import('three').WebGLRenderer | null = null;
    let envTex: import('three').Texture | null = null;
    const disposableGeos: Array<import('three').BufferGeometry> = [];
    const disposableMats: Array<import('three').Material> = [];

    (async () => {
      const THREE = await import('three');
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
      if (disposed || !containerRef.current) return;

      const width = Math.max(240, mount.clientWidth || 320);
      const height = Math.max(180, mount.clientHeight || 220);

      renderer = new THREE.WebGLRenderer({
        antialias: !probe.isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.setPixelRatio(probe.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = !probe.isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      mount.innerHTML = '';
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      pmrem.dispose();

      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
      camera.position.set(0, 1.3, 5.2);
      camera.lookAt(0, 0.2, 0);

      // Warm/Cool 3-point lighting rig
      const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
      keyLight.position.set(3, 5, 4);
      scene.add(keyLight);

      const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x94a3b8, 1.1);
      scene.add(hemiLight);

      const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.0);
      rimLight.position.set(-4, 2, -3);
      scene.add(rimLight);

      const heroGroup = new THREE.Group();
      scene.add(heroGroup);

      if (mode === 'badge') {
        // Composite 6-part 3D Trophy Badge
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.72, metalness: 0.1 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.22, metalness: 0.88 });
        const azureMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.25 });
        disposableMats.push(baseMat, goldMat, azureMat);

        const pedestalGeo = new THREE.CylinderGeometry(0.95, 1.15, 0.35, 32);
        const pedestal = new THREE.Mesh(pedestalGeo, baseMat);
        pedestal.position.y = -0.85;
        heroGroup.add(pedestal);

        const stemGeo = new THREE.CylinderGeometry(0.18, 0.28, 0.65, 24);
        const stem = new THREE.Mesh(stemGeo, goldMat);
        stem.position.y = -0.4;
        heroGroup.add(stem);

        const medallionGeo = new THREE.CylinderGeometry(0.92, 0.92, 0.18, 36);
        const medallion = new THREE.Mesh(medallionGeo, goldMat);
        medallion.rotation.x = Math.PI / 2;
        medallion.position.y = 0.48;
        heroGroup.add(medallion);

        const ringGeo = new THREE.TorusGeometry(0.96, 0.08, 16, 48);
        const ring = new THREE.Mesh(ringGeo, azureMat);
        ring.position.y = 0.48;
        heroGroup.add(ring);

        const coreGeo = new THREE.OctahedronGeometry(0.42, 0);
        const core = new THREE.Mesh(coreGeo, azureMat);
        core.position.set(0, 0.48, 0.14);
        heroGroup.add(core);

        const crownGeo = new THREE.ConeGeometry(0.24, 0.38, 6);
        const crown = new THREE.Mesh(crownGeo, goldMat);
        crown.position.y = 1.62;
        heroGroup.add(crown);

        disposableGeos.push(pedestalGeo, stemGeo, medallionGeo, ringGeo, coreGeo, crownGeo);
      } else {
        // Composite Copy-Split 3D Folder Diorama (source stays + duplicate slides right)
        const folderAMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45, metalness: 0.15 });
        const folderBMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4, metalness: 0.2 });
        const docMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78, metalness: 0.05 });
        disposableMats.push(folderAMat, folderBMat, docMat);

        const buildFolder = (mat: import('three').Material, x: number) => {
          const grp = new THREE.Group();
          const bodyGeo = new THREE.BoxGeometry(1.15, 0.8, 0.35);
          const tabGeo = new THREE.BoxGeometry(0.48, 0.18, 0.3);
          const pageGeo = new THREE.BoxGeometry(0.85, 0.65, 0.08);
          disposableGeos.push(bodyGeo, tabGeo, pageGeo);

          const body = new THREE.Mesh(bodyGeo, mat);
          const tab = new THREE.Mesh(tabGeo, mat);
          tab.position.set(-0.28, 0.46, 0);
          const page = new THREE.Mesh(pageGeo, docMat);
          page.position.set(0, 0.16, 0.04);

          grp.add(body, tab, page);
          grp.position.set(x, 0.1, 0);
          return grp;
        };

        heroGroup.add(buildFolder(folderAMat, -1.25));
        heroGroup.add(buildFolder(folderBMat, 1.25));

        const bridgeGeo = new THREE.TorusGeometry(0.55, 0.045, 12, 32, Math.PI);
        const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3, metalness: 0.4 });
        disposableGeos.push(bridgeGeo);
        disposableMats.push(bridgeMat);
        const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
        bridge.position.set(0, 0.45, 0);
        heroGroup.add(bridge);
      }

      let lastTime = performance.now();
      let angle = 0;

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

      const tick = () => {
        if (disposed || !renderer) return;
        if (document.hidden) {
          frameId = window.setTimeout(tick, 200);
          return;
        }
        const now = performance.now();
        const dt = Math.min(0.1, (now - lastTime) / 1000);
        lastTime = now;

        angle += dt * 0.75;
        heroGroup.rotation.y = Math.sin(angle) * 0.42;
        heroGroup.position.y = Math.sin(angle * 2) * 0.06;

        renderer.render(scene, camera);
        if (probe.isSoftwareGl) {
          afterDraw(tick);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      };

      const handleResize = () => {
        if (!renderer || !mount) return;
        const w = Math.max(220, mount.clientWidth || 320);
        const h = Math.max(180, mount.clientHeight || 220);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      window.addEventListener('resize', handleResize);
      tick();

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      disposableGeos.forEach((g) => g.dispose());
      disposableMats.forEach((m) => m.dispose());
      envTex?.dispose();
      renderer?.dispose();
    };
  }, [lowSpec2D, mode]);

  if (fallback2D) {
    return (
      <div
        data-testid="effect-2d-fallback"
        className="w-full rounded-2xl border border-slate-200 dark:border-[#25334D] bg-slate-50 dark:bg-[#131D31] p-5 flex flex-col items-center justify-center text-center gap-3 min-h-[190px] transition-colors"
      >
        {mode === 'badge' ? (
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center text-amber-700 dark:text-amber-300">
            <Award className="w-9 h-9" />
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200">
              <Folder className="w-8 h-8" />
              <span className="text-xs font-semibold">Thư mục nguồn (vẫn còn)</span>
            </div>
            <Copy className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/60 text-sky-800 dark:text-sky-200">
              <Folder className="w-8 h-8" />
              <span className="text-xs font-semibold">Thư mục đích (có bản sao)</span>
            </div>
          </div>
        )}
        <div>
          <p className="font-display font-bold text-slate-900 dark:text-slate-100">{title}</p>
          {subtitle && <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 dark:border-[#25334D] bg-slate-50 dark:bg-[#0F172A] overflow-hidden transition-colors">
      <div
        ref={containerRef}
        data-testid="three-effect-canvas"
        className="w-full h-[210px]"
        aria-label={title}
      />
      <div className="px-4 py-2.5 border-t border-slate-200 dark:border-[#25334D] bg-white dark:bg-[#131D31] flex items-center justify-between gap-3">
        <div>
          <p className="font-display font-bold text-sm text-slate-900 dark:text-slate-100">{title}</p>
          {subtitle && <p className="text-xs text-slate-600 dark:text-slate-300">{subtitle}</p>}
        </div>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Minh họa 3D</span>
      </div>
    </div>
  );
};

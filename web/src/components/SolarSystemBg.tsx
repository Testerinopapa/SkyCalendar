"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

type PlanetSpec = {
  name: string;
  color: number;
  radiusPx: number; // visual radius in pixels (not to scale)
  orbitRadiusPx: number; // distance from sun in pixels
  orbitalPeriodDays: number; // sidereal period
};

const PLANETS: PlanetSpec[] = [
  { name: "Mercury", color: 0xb0b0b0, radiusPx: 2.5, orbitRadiusPx: 60, orbitalPeriodDays: 88 },
  { name: "Venus", color: 0xf5deb3, radiusPx: 3.5, orbitRadiusPx: 90, orbitalPeriodDays: 225 },
  { name: "Earth", color: 0x3b82f6, radiusPx: 4.0, orbitRadiusPx: 120, orbitalPeriodDays: 365 },
];

// 1 real second equals this many simulated days
const SIM_DAYS_PER_SECOND = 8;

export default function SolarSystemBg({ preset = 'high' }: { preset?: 'low' | 'medium' | 'high' }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const disposeRef = useRef<() => void>(() => {});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const presetDpr = preset === 'low' ? 1.25 : preset === 'medium' ? 1.75 : 2;
    const maxDpr = Number(process.env.NEXT_PUBLIC_SOLAR_DPR_MAX || presetDpr);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isFinite(maxDpr) ? maxDpr : 2));
    container.appendChild(renderer.domElement);

    // Perspective camera with slight tilt for depth
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
    camera.position.set(0, 200, 320);
    const cameraTarget = new THREE.Vector3(0, 0, 0);
    camera.lookAt(cameraTarget);

    // Postprocessing (bloom)
    const bloomEnabled = (process.env.NEXT_PUBLIC_SOLAR_BLOOM || (preset !== 'low' ? 'true' : 'false')) !== 'false';
    const bloomStrength = Number(process.env.NEXT_PUBLIC_SOLAR_BLOOM_STRENGTH || (preset === 'high' ? 0.7 : 0.5));
    const bloomRadius = Number(process.env.NEXT_PUBLIC_SOLAR_BLOOM_RADIUS || 0.8);
    const bloomThreshold = Number(process.env.NEXT_PUBLIC_SOLAR_BLOOM_THRESHOLD || 0.85);
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), bloomStrength, bloomRadius, bloomThreshold);
    if (bloomEnabled) composer.addPass(bloomPass);

    let resizeTimeout: number | null = null;
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      composer.setSize(w, h);
      bloomPass.setSize(w, h);
      if (resizeTimeout) window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        rebuildStarfield();
      }, 150);
    };
    resize();
    window.addEventListener("resize", resize);

    // Mouse parallax
    const parallax = { x: 0, y: 0 };
    const onMouse = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      parallax.x = nx;
      parallax.y = ny;
    };
    window.addEventListener("mousemove", onMouse);

    // Sun
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(10, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xffc107 })
    );
    scene.add(sun);

    // Orbits and planets
    const planetMeshes: THREE.Mesh[] = [];
    PLANETS.forEach((p) => {
      const orbitGeo = new THREE.RingGeometry(p.orbitRadiusPx - 0.2, p.orbitRadiusPx + 0.2, 256);
      const orbitMat = new THREE.MeshBasicMaterial({ color: 0x334155, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
      const orbit = new THREE.Mesh(orbitGeo, orbitMat);
      orbit.rotation.x = Math.PI / 2; // lay flat in XZ plane
      scene.add(orbit);

      const planet = new THREE.Mesh(
        new THREE.SphereGeometry(p.radiusPx, 32, 32),
        new THREE.MeshBasicMaterial({ color: p.color })
      );
      planet.name = p.name;
      scene.add(planet);
      planetMeshes.push(planet);
    });

    // Starfield (adaptive density)
    let stars: THREE.Points | null = null;
    const rebuildStarfield = () => {
      if (!container) return;
      if (stars) {
        scene.remove(stars);
        const oldGeo = stars.geometry as THREE.BufferGeometry;
        const oldMat = stars.material as THREE.Material;
        oldGeo.dispose();
        // @ts-ignore
        oldMat.dispose?.();
        stars = null;
      }
      const { clientWidth: w, clientHeight: h } = container;
      const megapixels = (w * h) / 1_000_000;
      const dpr = Math.min(window.devicePixelRatio, isFinite(maxDpr) ? maxDpr : 2);
      const defaultDensity = preset === 'low' ? 350 : preset === 'medium' ? 500 : 650;
      const density = Number(process.env.NEXT_PUBLIC_SOLAR_STARS_DENSITY || defaultDensity); // points per MP
      const starCount = Math.min(6000, Math.max(800, Math.floor(megapixels * density * (dpr > 1.5 ? 0.8 : 1))));
      const starGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const r = 1000 * Math.pow(Math.random(), 0.5);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false });
      stars = new THREE.Points(starGeo, starMat);
      scene.add(stars);
    };
    rebuildStarfield();

    let raf = 0;
    const startMs = performance.now();
    // Dev-only FPS overlay
    const showFps = process.env.NODE_ENV !== 'production';
    const fpsEl = showFps ? document.createElement('div') : null;
    if (fpsEl) {
      fpsEl.style.position = 'absolute';
      fpsEl.style.right = '8px';
      fpsEl.style.bottom = '8px';
      fpsEl.style.padding = '2px 6px';
      fpsEl.style.background = 'rgba(2,6,23,0.6)';
      fpsEl.style.color = '#9ca3af';
      fpsEl.style.fontSize = '11px';
      fpsEl.style.border = '1px solid rgba(148,163,184,0.2)';
      fpsEl.style.borderRadius = '4px';
      container.appendChild(fpsEl);
    }
    let lastFrame = performance.now();
    let fpsAcc = 0;
    let fpsCount = 0;
    const animate = () => {
      const nowMs = performance.now();
      const elapsedSec = (nowMs - startMs) / 1000;
      const simDays = elapsedSec * SIM_DAYS_PER_SECOND;

      PLANETS.forEach((p, idx) => {
        const theta = ((simDays % p.orbitalPeriodDays) / p.orbitalPeriodDays) * Math.PI * 2;
        const x = Math.cos(theta) * p.orbitRadiusPx;
        const z = Math.sin(theta) * p.orbitRadiusPx;
        planetMeshes[idx].position.set(x, 0, z);
      });

      // subtle parallax
      camera.position.x = parallax.x * 20;
      camera.position.y = 200 + parallax.y * 10;
      camera.lookAt(cameraTarget);

      composer.render();
      if (fpsEl) {
        const dt = nowMs - lastFrame;
        lastFrame = nowMs;
        const instFps = 1000 / Math.max(1, dt);
        fpsAcc += instFps;
        fpsCount++;
        if (fpsCount >= 12) {
          fpsEl.textContent = `${(fpsAcc / fpsCount).toFixed(0)} fps`;
          fpsAcc = 0;
          fpsCount = 0;
        }
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        lastFrame = performance.now();
        raf = requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    disposeRef.current = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      composer.dispose();
      if (fpsEl && fpsEl.parentElement) fpsEl.parentElement.removeChild(fpsEl);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose?.();
        // @ts-ignore
        if (mesh.material && mesh.material.dispose) mesh.material.dispose();
      });
    };

    return () => disposeRef.current();
  }, []);

  return <div ref={containerRef} className="absolute inset-0 z-0" aria-hidden />;
}



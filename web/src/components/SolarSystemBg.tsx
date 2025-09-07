"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

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
  const [selected, setSelected] = useState<PlanetSpec | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Perspective camera with slight tilt for depth
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
    camera.position.set(0, 200, 320);
    const cameraTarget = new THREE.Vector3(0, 0, 0);
    camera.lookAt(cameraTarget);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
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
    const nameToMesh = new Map<string, THREE.Mesh>();
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
      nameToMesh.set(p.name, planet);
    });

    // Starfield (GPU friendly)
    const starCount = 2000;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 1000 * Math.pow(Math.random(), 0.5); // more density near center
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, sizeAttenuation: true, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    let raf = 0;
    const startMs = performance.now();
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

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    // Click-to-select using simple hit test in screen space (approximate)
    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left - rect.width / 2;
      const my = e.clientY - rect.top - rect.height / 2;
      let hit: string | null = null;
      for (const p of PLANETS) {
        const mesh = nameToMesh.get(p.name)!;
        const dx = mx - mesh.position.x;
        const dy = my - mesh.position.y;
        const r = p.radiusPx + 6;
        if (dx * dx + dy * dy <= r * r) {
          hit = p.name;
          break;
        }
      }
      if (hit) {
        const planet = PLANETS.find((pp) => pp.name === hit) || null;
        // React state update outside of RAF
        setSelected(planet || null);
      } else {
        setSelected(null);
      }
    };
    container.addEventListener('click', onClick);

    disposeRef.current = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      container.removeEventListener('click', onClick);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose?.();
        // @ts-ignore
        if (mesh.material && mesh.material.dispose) mesh.material.dispose();
      });
    };

    return () => disposeRef.current();
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0">
      {selected && (
        <div className="absolute bottom-6 left-6 bg-slate-800/90 border border-slate-700/60 rounded-lg p-3 text-sm text-slate-200 max-w-xs z-10">
          <div className="font-semibold mb-1">{selected.name}</div>
          <div>Orbit radius: {selected.orbitRadiusPx}px</div>
          <div>Orbital period: {selected.orbitalPeriodDays} days</div>
          <button
            onClick={() => setSelected(null)}
            className="mt-2 px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}



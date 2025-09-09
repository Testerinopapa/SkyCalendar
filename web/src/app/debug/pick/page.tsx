"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function DebugPickPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [log, setLog] = useState<string>("");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 5000);
    camera.position.set(0, 80, 220);
    camera.lookAt(0, 0, 0);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    // Grid + axes
    scene.add(new THREE.GridHelper(600, 20, 0x2dd4bf, 0x334155));
    scene.add(new THREE.AxesHelper(80));

    // Create targets with invisible hit-spheres
    type Target = { name: string; mesh: THREE.Mesh; hit: THREE.Mesh };
    const targets: Target[] = [];
    const specs = [
      { name: "A", r: 6, x: -60, z: 0, color: 0x60a5fa },
      { name: "B", r: 8, x: 0, z: 0, color: 0xf59e0b },
      { name: "C", r: 10, x: 60, z: 0, color: 0x34d399 },
    ];
    for (const s of specs) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(s.r, 32, 32),
        new THREE.MeshBasicMaterial({ color: s.color })
      );
      mesh.position.set(s.x, 0, s.z);
      mesh.name = s.name;
      scene.add(mesh);
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(s.r + 14, 16, 16),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      hit.name = s.name;
      mesh.add(hit);
      targets.push({ name: s.name, mesh, hit });
    }

    const raycaster = new THREE.Raycaster();
    const mouseNdc = new THREE.Vector2();
    const getRect = () => renderer.domElement.getBoundingClientRect();

    const onMove = (e: MouseEvent) => {
      const rect = getRect();
      mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseNdc, camera);
      const hit1 = raycaster.intersectObjects(targets.map(t => t.hit), false);
      const hit2 = raycaster.intersectObjects(targets.map(t => t.mesh), false);
      container.style.cursor = hit1.length || hit2.length ? "pointer" : "auto";
    };
    window.addEventListener("mousemove", onMove);

    const onClick = (e: MouseEvent) => {
      const rect = getRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
      // Raw click log
      // eslint-disable-next-line no-console
      console.log('[DebugPick] raw click', { x: e.clientX, y: e.clientY, rect: { left: rect.left, top: rect.top, w: rect.width, h: rect.height } });
      mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseNdc, camera);
      const i1 = raycaster.intersectObjects(targets.map(t => t.hit), false);
      const i2 = raycaster.intersectObjects(targets.map(t => t.mesh), false);
      const names1 = i1.map(i => i.object.name).filter(Boolean);
      const names2 = i2.map(i => i.object.name).filter(Boolean);

      // proximity fallback
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const R = 28 * dpr;
      const prox: string[] = [];
      for (const t of targets) {
        const wp = new THREE.Vector3();
        t.mesh.getWorldPosition(wp);
        wp.project(camera);
        const sx = (wp.x * 0.5 + 0.5) * rect.width;
        const sy = (-wp.y * 0.5 + 0.5) * rect.height;
        const d2 = (sx - mx) ** 2 + (sy - my) ** 2;
        if (d2 <= R * R) prox.push(t.name);
      }

      const line = `hit-spheres: [${names1.join(", ")}] | meshes: [${names2.join(", ")}], prox: [${prox.join(", ")}], ndc=(${mouseNdc.x.toFixed(3)},${mouseNdc.y.toFixed(3)})`;
      setLog(line);
      // Mirror to console
      // eslint-disable-next-line no-console
      console.log('[DebugPick] result', line);
    };
    window.addEventListener("click", onClick);

    let raf = 0;
    const animate = () => {
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4">
      <h1 className="text-lg font-semibold mb-2">Picking Debugger</h1>
      <p className="text-xs opacity-80 mb-2">Click on spheres; logs hit-sphere, mesh, proximity, and NDC.</p>
      <div ref={containerRef} className="relative w-full h-[60vh] rounded border border-slate-700 overflow-hidden" />
      <pre className="mt-3 text-xs bg-slate-800/80 rounded p-2 border border-slate-700 whitespace-pre-wrap break-words">{log}</pre>
    </div>
  );
}



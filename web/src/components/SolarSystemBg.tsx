"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import PlanetInfoCard from "./PlanetInfoCard";
import { daysSinceJ2000, getPlanetPositionAU, ELEMENTS, type PlanetName } from "@/lib/ephemeris";

type PlanetSpec = {
	name: string;
	color: number;
	radiusPx: number; // visual radius in pixels (not to scale)
	orbitRadiusPx: number; // deprecated; kept for UI scaling
	orbitalPeriodDays: number; // sidereal period
};

const PLANETS: PlanetSpec[] = [
	{ name: "Mercury", color: 0xb0b0b0, radiusPx: 2.5, orbitRadiusPx: 60, orbitalPeriodDays: 88 },
	{ name: "Venus", color: 0xf5deb3, radiusPx: 3.5, orbitRadiusPx: 90, orbitalPeriodDays: 225 },
	{ name: "Earth", color: 0x3b82f6, radiusPx: 4.0, orbitRadiusPx: 120, orbitalPeriodDays: 365 },
	{ name: "Mars", color: 0xff6b6b, radiusPx: 3.0, orbitRadiusPx: 160, orbitalPeriodDays: 687 },
	{ name: "Jupiter", color: 0xd1b48c, radiusPx: 7.0, orbitRadiusPx: 220, orbitalPeriodDays: 4333 },
	{ name: "Saturn", color: 0xdcc9a6, radiusPx: 6.0, orbitRadiusPx: 280, orbitalPeriodDays: 10759 },
	{ name: "Uranus", color: 0x7dd3fc, radiusPx: 5.0, orbitRadiusPx: 340, orbitalPeriodDays: 30688 },
	{ name: "Neptune", color: 0x60a5fa, radiusPx: 5.0, orbitRadiusPx: 400, orbitalPeriodDays: 60182 },
];

// 1 real second equals this many simulated days
const SIM_DAYS_PER_SECOND = 8;
const ENABLE_OVERLAY_BUTTONS = false;

function createGlowTexture(): THREE.Texture {
	const size = 128;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d')!;
	const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
	g.addColorStop(0.0, 'rgba(255,255,255,0.9)');
	g.addColorStop(0.3, 'rgba(255,255,255,0.5)');
	g.addColorStop(0.7, 'rgba(255,255,255,0.15)');
	g.addColorStop(1.0, 'rgba(255,255,255,0.0)');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, size, size);
	const tex = new THREE.CanvasTexture(canvas);
	tex.anisotropy = 1;
	tex.needsUpdate = true;
	return tex;
}

export default function SolarSystemBg({ preset = 'high' }: { preset?: 'low' | 'medium' | 'high' }) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const disposeRef = useRef<() => void>(() => {});
	const [selected, setSelected] = useState<PlanetSpec | null>(null);
	const [hoveredName, setHoveredName] = useState<string | null>(null);
	const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
	const [cardPos, setCardPos] = useState<{ x: number; y: number } | null>(null);
	const buttonsContainerRef = useRef<HTMLDivElement | null>(null);
	const planetButtonMapRef = useRef<Map<string, HTMLButtonElement>>(new Map());
	const uiOverlayRef = useRef<HTMLDivElement | null>(null);
	const router = useRouter();

	const logPlanetClick = (planetName: string) => {
		try {
			const payload = JSON.stringify({ type: 'planet_click', name: planetName, ts: new Date().toISOString() });
			if (navigator.sendBeacon) {
				const blob = new Blob([payload], { type: 'application/json' });
				navigator.sendBeacon('/api/debug/log', blob);
			} else {
				fetch('/api/debug/log', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: payload,
					keepalive: true,
				}).catch(() => {});
			}
		} catch {}
	};

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

		// Mouse parallax + hover pick
		const parallax = { x: 0, y: 0 };
		const raycaster = new THREE.Raycaster();
		const mouseNdc = new THREE.Vector2();
		let currentHovered: string | null = null;
		const nameToGlow = new Map<string, THREE.Sprite>();
		const updateGlow = (nm: string | null) => {
			nameToGlow.forEach((sprite, name) => {
				const mat = sprite.material as THREE.SpriteMaterial;
				mat.opacity = nm && nm === name ? 0.85 : 0.0;
			});
		};
		const onMouse = (e: MouseEvent) => {
			const rect = container.getBoundingClientRect();
			const nx = (e.clientX - rect.left) / rect.width - 0.5;
			const ny = (e.clientY - rect.top) / rect.height - 0.5;
			parallax.x = nx;
			parallax.y = ny;

			// Hover pick via raycaster
			mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
			mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
			raycaster.setFromCamera(mouseNdc, camera);
			const hits = raycaster.intersectObjects(hitMeshes.length ? hitMeshes : planetMeshes, false);
			if (hits.length > 0) {
				const o = hits[0].object as THREE.Mesh;
				const nm = o.name || (o.parent ? o.parent.name : "");
				setHoveredName(nm || null);
				const wp = new THREE.Vector3();
				const posMesh = (nm && nameToMesh.get(nm)) || o;
				posMesh.getWorldPosition(wp);
				wp.project(camera);
				const sx = (wp.x * 0.5 + 0.5) * rect.width;
				const sy = (-wp.y * 0.5 + 0.5) * rect.height;
				setHoverPos({ x: sx, y: sy - 14 });
				container.style.cursor = 'pointer';
				if (nm !== currentHovered) {
					currentHovered = nm || null;
					updateGlow(currentHovered);
				}
			} else {
				setHoveredName(null);
				setHoverPos(null);
				container.style.cursor = 'auto';
				if (currentHovered !== null) {
					currentHovered = null;
					updateGlow(null);
				}
			}
		};
		window.addEventListener("mousemove", onMouse);

		// Sun
		const sun = new THREE.Mesh(
			new THREE.SphereGeometry(10, 48, 48),
			new THREE.MeshBasicMaterial({ color: 0xffc107 })
		);
		sun.name = 'Sun';
		scene.add(sun);

		// Orbits and planets
		const planetMeshes: THREE.Mesh[] = [];
		const hitMeshes: THREE.Mesh[] = [];
		const nameToMesh = new Map<string, THREE.Mesh>();
		const glowTexture = createGlowTexture();
		const AU_TO_PX = 120; // scale factor: 1 AU = 120 px (tune for view)
		PLANETS.forEach((p) => {
			const aAU = ELEMENTS[p.name as PlanetName].aAU;
			const orbitR = aAU * AU_TO_PX; // draw based on semi-major axis
			const orbitGeo = new THREE.RingGeometry(orbitR - 0.2, orbitR + 0.2, 256);
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

			// Invisible larger hit-sphere for easier picking
			const hit = new THREE.Mesh(
				new THREE.SphereGeometry(p.radiusPx + 10, 16, 16),
				new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
			);
			hit.name = p.name;
			planet.add(hit);
			hitMeshes.push(hit);

			// Additive glow sprite (initially hidden)
			const glow = new THREE.Sprite(
				new THREE.SpriteMaterial({
					map: glowTexture,
					color: p.color,
					transparent: true,
					opacity: 0.0,
					blending: THREE.AdditiveBlending,
					depthWrite: false,
				})
			);
			glow.scale.set(p.radiusPx * 6, p.radiusPx * 6, 1);
			planet.add(glow);
			nameToGlow.set(p.name, glow);
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
		let focusName: string | null = null;
		// Time accumulation for simulation; pause when focused
		let simDays = daysSinceJ2000(Date.now());
		let prevMs = performance.now();
		let paused = false;
		const animate = () => {
			const nowMs = performance.now();
			const deltaSec = (nowMs - prevMs) / 1000;
			prevMs = nowMs;
			if (!paused) {
				simDays += deltaSec * SIM_DAYS_PER_SECOND;
			}
			const tDays = simDays;

			PLANETS.forEach((p, idx) => {
				const pos = getPlanetPositionAU(p.name as any, tDays);
				const x = pos.x * AU_TO_PX;
				const z = pos.y * AU_TO_PX; // map ecliptic y->scene z
				planetMeshes[idx].position.set(x, 0, z);
			});

			// Camera targeting and zoom/focus
			const basePos = new THREE.Vector3(parallax.x * 20, 200 + parallax.y * 10, 320);
			let desiredTarget = new THREE.Vector3(0, 0, 0);
			let desiredPos = basePos.clone();
			if (focusName) {
				const mesh = nameToMesh.get(focusName);
				if (mesh) {
					const wp = new THREE.Vector3();
					mesh.getWorldPosition(wp);
					desiredTarget.copy(wp);
					// Focus offset with gentle parallax
					const offset = new THREE.Vector3(parallax.x * 10, 25 + parallax.y * 5, 60);
					desiredPos.copy(wp).add(offset);
					// Compute lower-left circumference screen position for info card
					const planet = PLANETS.find(p => p.name === focusName)!;
					const local = new THREE.Vector3(-planet.radiusPx - 8, -planet.radiusPx - 8, 0);
					const planetWorld = new THREE.Vector3();
					mesh.getWorldPosition(planetWorld);
					const cardWorld = planetWorld.clone().add(local);
					const clip = cardWorld.clone().project(camera);
					const rect = container.getBoundingClientRect();
					const sx = (clip.x * 0.5 + 0.5) * rect.width;
					const sy = (-clip.y * 0.5 + 0.5) * rect.height;
					setCardPos({ x: sx, y: sy });
				}
			}
			// Smoothly approach desired camera position and target
			camera.position.lerp(desiredPos, 0.08);
			cameraTarget.lerp(desiredTarget, 0.1);
			camera.lookAt(cameraTarget);

			renderer.render(scene, camera);
			// Update DOM button positions each frame (only if enabled)
			if (ENABLE_OVERLAY_BUTTONS && buttonsContainerRef.current) {
				const rect = container.getBoundingClientRect();
				PLANETS.forEach((p) => {
					const mesh = nameToMesh.get(p.name);
					const btn = planetButtonMapRef.current.get(p.name);
					if (mesh && btn) {
						const wp = new THREE.Vector3();
						mesh.getWorldPosition(wp);
						wp.project(camera);
						const sx = (wp.x * 0.5 + 0.5) * rect.width;
						const sy = (-wp.y * 0.5 + 0.5) * rect.height;
						btn.style.left = `${sx}px`;
						btn.style.top = `${sy}px`;
					}
				});
			}
			raf = requestAnimationFrame(animate);
		};
		raf = requestAnimationFrame(animate);

		// Pointer gating: only navigate if target is consistent between down and up
		let pointerDownName: string | null = null;
		const hitTestAtEvent = (e: PointerEvent): string | null => {
			const rect = container.getBoundingClientRect();
			mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
			mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
			raycaster.setFromCamera(mouseNdc, camera);
			let hit: string | null = null;
			const rayHits = raycaster.intersectObjects(hitMeshes.length ? hitMeshes : planetMeshes, true);
			if (rayHits.length > 0) {
				const obj = rayHits[0].object as THREE.Object3D;
				hit = obj.name || (obj.parent ? obj.parent.name : null);
			}
			if (!hit) {
				const mx = e.clientX - rect.left - rect.width / 2;
				const my = e.clientY - rect.top - rect.height / 2;
				let bestName: string | null = null;
				let bestDist = Infinity;
				for (const p of PLANETS) {
					const mesh = nameToMesh.get(p.name)!;
					const dx = mx - mesh.position.x;
					const dy = my - mesh.position.y;
					const r = p.radiusPx + 10;
					const d2 = dx * dx + dy * dy;
					if (d2 <= r * r && d2 < bestDist) { bestName = p.name; bestDist = d2; }
				}
				hit = bestName;
			}
			return hit;
		};
		const isInside = (e: PointerEvent) => {
			const rect = container.getBoundingClientRect();
			return e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
		};
		const isFromUiOverlay = (el: EventTarget | null) => {
			const root = uiOverlayRef.current;
			return !!(root && el instanceof Node && root.contains(el));
		};

		const onPointerDown = (e: PointerEvent) => {
			if (isFromUiOverlay(e.target)) return; // ignore UI interactions
			if (!isInside(e)) { pointerDownName = null; return; }
			pointerDownName = hitTestAtEvent(e);
		};
		const onPointerUp = (e: PointerEvent) => {
			if (isFromUiOverlay(e.target)) return; // ignore UI interactions
			const upName = isInside(e) ? hitTestAtEvent(e) : null;
			if (pointerDownName && upName && pointerDownName === upName) {
				// eslint-disable-next-line no-console
				console.log('[SolarSystemBg] focus', upName);
				logPlanetClick(String(upName));
				focusName = String(upName);
				const planet = PLANETS.find(pp => pp.name === focusName) || null;
				setSelected(planet || null);
				paused = true; // pause universe when focusing
			} else if (pointerDownName !== null) {
				focusName = null;
				setSelected(null);
				paused = false; // resume when unfocusing
			}
			pointerDownName = null;
		};
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				focusName = null;
				setSelected(null);
			}
		};
		window.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true } as AddEventListenerOptions);
		window.addEventListener('pointerup', onPointerUp, { capture: true, passive: true } as AddEventListenerOptions);
		window.addEventListener('keydown', onKeyDown, { capture: true } as AddEventListenerOptions);

		disposeRef.current = () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", resize);
			window.removeEventListener("mousemove", onMouse);
			renderer.dispose();
			container.removeChild(renderer.domElement);
			window.removeEventListener('pointerdown', onPointerDown, { capture: true } as EventListenerOptions);
			window.removeEventListener('pointerup', onPointerUp, { capture: true } as EventListenerOptions);
			window.removeEventListener('keydown', onKeyDown, { capture: true } as EventListenerOptions);
			scene.traverse((obj) => {
				const mesh = obj as THREE.Mesh;
				if (mesh.geometry) mesh.geometry.dispose?.();
				// @ts-ignore
				if (mesh.material && mesh.material.dispose) mesh.material.dispose();
			});
			glowTexture.dispose();
		};

		return () => disposeRef.current();
	}, []);

	return (
		<div ref={containerRef} className="absolute inset-0 z-0">
			<div ref={buttonsContainerRef} className="absolute inset-0 z-20 pointer-events-none" />
			{hoveredName && hoverPos && (
				<div
					className="absolute z-20 text-xs px-2 py-1 rounded bg-slate-900/90 border border-slate-700/70 text-slate-200 pointer-events-none"
					style={{ left: `${hoverPos.x}px`, top: `${hoverPos.y}px`, transform: 'translate(-50%, -100%)' }}
				>
					{hoveredName}
				</div>
			)}
			{selected && cardPos && createPortal(
				<div
					ref={uiOverlayRef}
					className="fixed z-50 pointer-events-auto"
					style={{ left: `${cardPos.x}px`, top: `${cardPos.y}px`, transform: 'translate(-100%, 0)' }}
				>
					<PlanetInfoCard
						planet={selected}
						onClose={() => setSelected(null)}
					/>
				</div>,
				document.body
			)}
		</div>
	);
}



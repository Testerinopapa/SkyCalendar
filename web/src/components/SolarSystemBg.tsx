"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import FlightController from "@/immersive/FlightController";
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

function createStarSpriteTexture(): THREE.Texture {
	const size = 64;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d')!;
	const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
	g.addColorStop(0.0, 'rgba(255,255,255,1.0)');
	g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
	g.addColorStop(1.0, 'rgba(255,255,255,0.0)');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, size, size);
	const tex = new THREE.CanvasTexture(canvas);
	tex.anisotropy = 1;
	tex.needsUpdate = true;
	return tex;
}

function createOrthonormalBasisFromNormal(normal: THREE.Vector3) {
	const n = normal.clone().normalize();
	const arbitrary = Math.abs(n.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
	const u = new THREE.Vector3().crossVectors(n, arbitrary).normalize();
	const v = new THREE.Vector3().crossVectors(n, u).normalize();
	return { n, u, v };
}

function sampleMilkyWayDirection(basis: { n: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3 }, bandSigmaRad: number) {
	// yaw uniformly around the band, latitude from a normal distribution around 0
	const yaw = Math.random() * Math.PI * 2;
	// Box-Muller for gaussian latitude
	const u1 = Math.random();
	const u2 = Math.random();
	const z0 = Math.sqrt(-2.0 * Math.log(Math.max(1e-8, u1))) * Math.cos(2.0 * Math.PI * u2);
	const lat = z0 * bandSigmaRad; // small angle in radians
	const cosLat = Math.cos(lat);
	const sinLat = Math.sin(lat);
	const dir = new THREE.Vector3()
		.copy(basis.u).multiplyScalar(Math.cos(yaw) * cosLat)
		.add(new THREE.Vector3().copy(basis.v).multiplyScalar(Math.sin(yaw) * cosLat))
		.add(new THREE.Vector3().copy(basis.n).multiplyScalar(sinLat))
		.normalize();
	return dir;
}

export default function SolarSystemBg({ preset = 'high' }: { preset?: 'low' | 'medium' | 'high' }) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const disposeRef = useRef<() => void>(() => {});
	const [selected, setSelected] = useState<PlanetSpec | null>(null);
	const [hoveredName, setHoveredName] = useState<string | null>(null);
	const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
	const [cardPos, setCardPos] = useState<{ x: number; y: number } | null>(null);
	const [immersiveUiVisible, setImmersiveUiVisible] = useState<boolean>(false);
	const [groundOcclusion, setGroundOcclusion] = useState<number>(0);
	const buttonsContainerRef = useRef<HTMLDivElement | null>(null);
	const planetButtonMapRef = useRef<Map<string, HTMLButtonElement>>(new Map());
	const uiOverlayRef = useRef<HTMLDivElement | null>(null);
	const router = useRouter();

	const flightRef = useRef<FlightController | null>(null);

	const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

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

		// Defer flight controller wiring until meshes are ready (set after planet creation below)
		let getPlanetInfo: (planetName: string) => { center: THREE.Vector3; radius: number } | null = () => null;

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

		// Basic lighting: directional from Sun + faint ambient
		const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
		sunLight.position.set(0, 0, 0);
		sun.add(sunLight);
		const ambient = new THREE.AmbientLight(0xffffff, 0.12);
		scene.add(ambient);

		// Orbits and planets
		const planetMeshes: THREE.Mesh[] = [];
		const orbitMeshes: THREE.Mesh[] = [];
		const hitMeshes: THREE.Mesh[] = [];
		const nameToMesh = new Map<string, THREE.Mesh>();
		const glowTexture = createGlowTexture();
		const AU_TO_PX = 120; // scale factor: 1 AU = 120 px (tune for view)
		const texLoader = new THREE.TextureLoader();

		PLANETS.forEach((p) => {
			const aAU = ELEMENTS[p.name as PlanetName].aAU;
			const orbitR = aAU * AU_TO_PX; // draw based on semi-major axis
			const orbitGeo = new THREE.RingGeometry(orbitR - 0.2, orbitR + 0.2, 256);
			const orbitMat = new THREE.MeshBasicMaterial({ color: 0x334155, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
			const orbit = new THREE.Mesh(orbitGeo, orbitMat);
			orbit.rotation.x = Math.PI / 2; // lay flat in XZ plane
			scene.add(orbit);
			orbitMeshes.push(orbit);

			const isEarth = p.name === 'Earth';
			const planetMat = isEarth
				? new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.8, metalness: 0.0 })
				: new THREE.MeshBasicMaterial({ color: p.color });
			const planet = new THREE.Mesh(new THREE.SphereGeometry(p.radiusPx, 32, 32), planetMat);
			planet.name = p.name;
			scene.add(planet);
			planetMeshes.push(planet);
			nameToMesh.set(p.name, planet);

			// Simple atmosphere shell for Earth
			if (isEarth) {
				// Day albedo map
				texLoader.load(
					'https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg',
					(tex) => {
						tex.colorSpace = THREE.SRGBColorSpace as any;
						tex.anisotropy = 2;
						(planet.material as THREE.MeshStandardMaterial).map = tex;
						(planet.material as THREE.MeshStandardMaterial).needsUpdate = true;
					},
					undefined,
					() => {}
				);

				// Clouds layer
				const atmoGeo = new THREE.SphereGeometry(p.radiusPx * 1.05, 32, 32);
				const atmoMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
				const atmo = new THREE.Mesh(atmoGeo, atmoMat);
				planet.add(atmo);
				texLoader.load(
					'https://www.solarsystemscope.com/textures/download/2k_earth_clouds.jpg',
					(tex) => {
						tex.colorSpace = THREE.SRGBColorSpace as any;
						tex.anisotropy = 2;
						atmoMat.map = tex;
						atmoMat.needsUpdate = true;
					},
					undefined,
					() => {}
				);
			}

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

		// Initialize flight controller now that meshes exist
		getPlanetInfo = (planetName: string) => {
			const mesh = nameToMesh.get(planetName);
			if (!mesh) return null;
			const center = new THREE.Vector3();
			mesh.getWorldPosition(center);
			const spec = PLANETS.find(pp => pp.name === planetName);
			return { center, radius: (spec?.radiusPx ?? 5) };
		};
		flightRef.current = new FlightController(getPlanetInfo);

		// Starfield: multi-layer distant shell + Milky Way band
		const STAR_SHELL_RADIUS = 1800; // less than camera far (2000)
		const starSprite = createStarSpriteTexture();
		const starGroup = new THREE.Group();
		scene.add(starGroup);

		function buildLayer(count: number, size: number, dimBias: number, hueJitter: number) {
			const geo = new THREE.BufferGeometry();
			const pos = new Float32Array(count * 3);
			const col = new Float32Array(count * 3);
			const tmpColor = new THREE.Color();
			for (let i = 0; i < count; i++) {
				const u = Math.random();
				const v = Math.random();
				const theta = 2 * Math.PI * u;
				const phi = Math.acos(2 * v - 1);
				const x = STAR_SHELL_RADIUS * Math.sin(phi) * Math.cos(theta);
				const y = STAR_SHELL_RADIUS * Math.sin(phi) * Math.sin(theta);
				const z = STAR_SHELL_RADIUS * Math.cos(phi);
				pos[i * 3 + 0] = x;
				pos[i * 3 + 1] = y;
				pos[i * 3 + 2] = z;
				// brightness and slight color temperature variation
				const mag = Math.pow(Math.random(), dimBias);
				const intensity = 0.3 + 0.7 * mag;
				const hue = 0.58 + (Math.random() - 0.5) * hueJitter; // around white/blue
				tmpColor.setHSL(hue, 0.1 + 0.2 * Math.random(), intensity);
				col[i * 3 + 0] = tmpColor.r;
				col[i * 3 + 1] = tmpColor.g;
				col[i * 3 + 2] = tmpColor.b;
			}
			geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
			geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
			const mat = new THREE.PointsMaterial({
				color: 0xffffff,
				size,
				sizeAttenuation: true,
				map: starSprite,
				transparent: true,
				opacity: 0.95,
				depthWrite: false,
				depthTest: true,
				vertexColors: true,
				blending: THREE.AdditiveBlending,
			});
			// @ts-ignore
			mat.alphaTest = 0.01;
			const pts = new THREE.Points(geo, mat);
			pts.frustumCulled = false;
			starGroup.add(pts);
		}

		// Density per preset
		const baseCount = preset === 'low' ? 1500 : (preset === 'medium' ? 3000 : 5000);
		const brightCount = preset === 'low' ? 250 : (preset === 'medium' ? 450 : 700);
		const milkyCount = preset === 'low' ? 800 : (preset === 'medium' ? 1400 : 2200);

		buildLayer(baseCount, 1.2, 3.0, 0.04);   // many dim small stars
		buildLayer(brightCount, 2.0, 1.8, 0.08); // fewer brighter, slightly larger

		// Milky Way band centered on a fixed great circle (choose an arbitrary, pleasing orientation)
		const bandNormal = new THREE.Vector3(0.2, 0.9, -0.3).normalize();
		const basis = createOrthonormalBasisFromNormal(bandNormal);
		const bandGeo = new THREE.BufferGeometry();
		const bandPos = new Float32Array(milkyCount * 3);
		const bandCol = new Float32Array(milkyCount * 3);
		const bandColor = new THREE.Color();
		const bandSigmaRad = THREE.MathUtils.degToRad(12); // band half-thickness
		for (let i = 0; i < milkyCount; i++) {
			const dir = sampleMilkyWayDirection(basis, bandSigmaRad);
			bandPos[i * 3 + 0] = dir.x * STAR_SHELL_RADIUS;
			bandPos[i * 3 + 1] = dir.y * STAR_SHELL_RADIUS;
			bandPos[i * 3 + 2] = dir.z * STAR_SHELL_RADIUS;
			// slightly bluish/whitish band with more dim-to-mid brightness
			const mag = Math.pow(Math.random(), 2.2);
			const intensity = 0.35 + 0.65 * mag;
			const hue = 0.56 + (Math.random() - 0.5) * 0.03;
			bandColor.setHSL(hue, 0.12 + 0.12 * Math.random(), intensity);
			bandCol[i * 3 + 0] = bandColor.r;
			bandCol[i * 3 + 1] = bandColor.g;
			bandCol[i * 3 + 2] = bandColor.b;
		}
		bandGeo.setAttribute("position", new THREE.BufferAttribute(bandPos, 3));
		bandGeo.setAttribute("color", new THREE.BufferAttribute(bandCol, 3));
		const bandMat = new THREE.PointsMaterial({
			color: 0xffffff,
			size: 1.5,
			sizeAttenuation: true,
			map: starSprite,
			transparent: true,
			opacity: 0.9,
			depthWrite: false,
			depthTest: true,
			vertexColors: true,
			blending: THREE.AdditiveBlending,
		});
		// @ts-ignore
		bandMat.alphaTest = 0.01;
		const band = new THREE.Points(bandGeo, bandMat);
		band.frustumCulled = false;
		starGroup.add(band);

		// Star fade helper
		const adjustStarOpacity = (factor: number) => {
			const f = THREE.MathUtils.clamp(factor, 0.05, 1);
			starGroup.children.forEach((child) => {
				const pts = child as THREE.Points;
				const mat = pts.material as THREE.PointsMaterial;
				mat.opacity = 0.95 * f;
			});
		};

		let raf = 0;
		let focusName: string | null = null;
		// Time accumulation for simulation; pause when focused
		let simDays = daysSinceJ2000(Date.now());
		let prevMs = performance.now();
		let paused = false;

		const computeImmersiveTargets = (name: string) => {
			const mesh = nameToMesh.get(name);
			if (!mesh) return { pos: new THREE.Vector3(0, 0, 0), target: new THREE.Vector3(0, 0, 0) };
			const planetSpec = PLANETS.find(p => p.name === name);
			const planetRadius = (planetSpec?.radiusPx ?? 5);
			const wp = new THREE.Vector3();
			mesh.getWorldPosition(wp);
			// Define north pole using world up
			const poleUp = new THREE.Vector3(0, 1, 0);
			// East is perpendicular to pole and radial direction
			let east = new THREE.Vector3().crossVectors(poleUp, wp.clone().normalize());
			if (east.lengthSq() < 1e-6) east.set(1, 0, 0);
			east.normalize();
			// Phase 1: near-surface first-person at north pole (very close)
			const nearHeight = Math.max(planetRadius * 0.015, 0.2);
			const nearLook = planetRadius * 2.2;
			const endHeight = Math.max(planetRadius * 8, 28);
			const endSide = planetRadius * 0.8; // slight offset on ascent
			const endLook = planetRadius * 7.0;
			const nearPos = wp.clone().addScaledVector(poleUp, nearHeight);
			const nearTarget = nearPos
				.clone()
				.addScaledVector(east, nearLook)
				.addScaledVector(poleUp, -planetRadius * 0.25); // slight tilt down so planet fills view
			const endPos = wp.clone().addScaledVector(poleUp, endHeight).addScaledVector(east, -endSide);
			const endTarget = endPos.clone().addScaledVector(east, endLook * 0.6).addScaledVector(poleUp, planetRadius * 0.3);
			return { nearPos, nearTarget, endPos, endTarget, center: wp, radius: planetRadius } as const;
		};

		const enterImmersive = (name: string) => {
			try {
				if (!flightRef.current) return;
				flightRef.current.enterImmersive(name, camera.position.clone(), cameraTarget.clone());
				setImmersiveUiVisible(true);
				// keep sim running so planets move
				paused = false;
			} catch {}
		};

		const exitImmersive = () => {
			try {
				if (!flightRef.current) return;
				flightRef.current.exitImmersive(camera.position.clone(), cameraTarget.clone());
				setImmersiveUiVisible(false);
			} catch {}
		};
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

			// Keep starfield centered on camera to avoid parallax translation
			starGroup.position.copy(camera.position);

			// Camera targeting and zoom/focus
			const basePos = new THREE.Vector3(parallax.x * 20, 200 + parallax.y * 10, 320);
			let desiredTarget = new THREE.Vector3(0, 0, 0);
			let desiredPos = basePos.clone();

			const flight = flightRef.current;
			if (flight) {
				const out = flight.update(deltaSec);
				if (out) {
					desiredPos.copy(out.desiredPosition);
					desiredTarget.copy(out.desiredTarget);
					adjustStarOpacity(out.starOpacity);
					setGroundOcclusion(out.groundOcclusion);
				}
			}

			if (!flight || flight.getMode() === 'system') {
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
				adjustStarOpacity(1);
				setGroundOcclusion(0);
			}
			// Smoothly approach desired camera position and target
			camera.position.lerp(desiredPos, 0.12);
			cameraTarget.lerp(desiredTarget, 0.14);
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
			if (isFromUiOverlay(e.target)) { pointerDownName = null; return; } // ignore UI interactions and clear stale state
			if (!isInside(e)) { pointerDownName = null; return; }
			pointerDownName = hitTestAtEvent(e);
		};
		const onPointerUp = (e: PointerEvent) => {
			if (isFromUiOverlay(e.target)) { pointerDownName = null; return; } // ignore UI interactions and clear stale state
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
				const s = flightRef.current;
				if (s && (s.getMode() === 'immersive' || s.getMode() === 'toImmersive')) {
					exitImmersive();
				} else {
					focusName = null;
					setSelected(null);
				}
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

		// Expose controls for integration/tests (no global typing changes)
		if (containerRef.current) {
			// @ts-ignore
			(containerRef.current as any).__enterImmersive = enterImmersive;
			// @ts-ignore
			(containerRef.current as any).__exitImmersive = exitImmersive;
		}

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
					<div className="mt-2 flex gap-2">
						<button
							className="px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700 hover:bg-slate-700"
							onClick={() => {
								if (selected) {
									// eslint-disable-next-line no-console
									console.log('[SolarSystemBg] enter immersive', selected.name);
									const el = containerRef.current as unknown as { __enterImmersive?: (name: string) => void } | null;
									if (el && el.__enterImmersive) el.__enterImmersive(selected.name);
								}
							}}
						>
							Enter immersive
						</button>
						<button
							className="px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700 hover:bg-slate-700"
							onClick={() => {
								const el = containerRef.current as unknown as { __exitImmersive?: () => void } | null;
								if (el && el.__exitImmersive) el.__exitImmersive();
							}}
						>
							Exit immersive
						</button>
					</div>
				</div>,
				document.body
			)}
			{immersiveUiVisible && (
				<div className="fixed top-4 right-4 z-50 pointer-events-auto">
					<button
						className="px-3 py-1 text-xs rounded bg-slate-800/90 border border-slate-700 hover:bg-slate-700"
						onClick={() => {
							const el = containerRef.current as unknown as { __exitImmersive?: () => void } | null;
							if (el && el.__exitImmersive) el.__exitImmersive();
						}}
					>
						Exit immersive
					</button>
				</div>
			)}
			{(immersiveUiVisible || groundOcclusion > 0.001) && (
				<div
					className="pointer-events-none fixed inset-0 z-40"
					style={{
						background: `linear-gradient(to top, rgba(2,6,23,${0.85 * groundOcclusion}), rgba(2,6,23,0) 35%)`,
						transition: 'opacity 200ms ease',
						opacity: groundOcclusion,
					}}
				/>
			)}
		</div>
	);
}



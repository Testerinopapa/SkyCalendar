"use client";

import { useEffect, useState } from "react";
import type { PlanetDetail } from "@/types/domain";
import SpaceWeatherList from "./SpaceWeatherList";
import AstronomyMini from "./AstronomyMini";

type PlanetInfo = {
	name: string;
	color: number;
	orbitRadiusPx: number;
	orbitalPeriodDays: number;
};

export default function PlanetInfoCard({ planet, onClose, className }: { planet: PlanetInfo; onClose: () => void; className?: string }) {
	const colorHex = `#${planet.color.toString(16).padStart(6, "0")}`;
	const [details, setDetails] = useState<PlanetDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [showDetails, setShowDetails] = useState<boolean>(false);
	const [showWeather, setShowWeather] = useState<boolean>(false);
	const [showAstronomy, setShowAstronomy] = useState<boolean>(false);
	const [weatherLoading, setWeatherLoading] = useState(false);
	const [astroLoading, setAstroLoading] = useState(false);
	const [weatherCount, setWeatherCount] = useState<number | null>(null);
	const [astroSummary, setAstroSummary] = useState<string | null>(null);

	useEffect(() => {
		let alive = true;
		const name = planet.name.toLowerCase();
		fetch(`/api/planets/${encodeURIComponent(name)}`)
			.then(async (r) => {
				if (!alive) return;
				if (!r.ok) {
					setError(`Failed (${r.status})`);
					return;
				}
				const d = await r.json();
				setDetails(d);
			})
			.catch(() => alive && setError("Failed to load details"));
		return () => { alive = false };
	}, [planet.name]);

	useEffect(() => {
		let alive = true;
		fetch('/api/space-weather')
			.then(async (r) => {
				if (!alive) return;
				if (!r.ok) return;
				const arr = await r.json();
				if (Array.isArray(arr)) setWeatherCount(arr.length);
			})
			.catch(() => {});
		const loadAstronomy = (lat: number, lon: number) => {
			fetch(`/api/astronomy?lat=${lat}&lon=${lon}`)
				.then(async (r) => {
					if (!alive) return;
					if (!r.ok) return;
					const d = await r.json();
					const ill = d?.daily?.moon_illumination?.[0];
					const phase = d?.daily?.moon_phase?.[0];
					if (ill !== undefined && ill !== null) setAstroSummary(`${ill}%${phase ? ` ${phase}` : ''}`);
				})
				.catch(() => {});
		};
		try {
			if (typeof navigator !== 'undefined' && navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(
					(pos) => loadAstronomy(pos.coords.latitude, pos.coords.longitude),
					() => loadAstronomy(37.7749, -122.4194),
					{ maximumAge: 300000, timeout: 3000 }
				);
			} else {
				loadAstronomy(37.7749, -122.4194);
			}
		} catch {
			loadAstronomy(37.7749, -122.4194);
		}
		return () => { alive = false };
	}, []);

	return (
		<div
			className={(className ? className + " " : "") + "bg-slate-900/90 border border-slate-700/60 rounded-xl p-4 text-sm text-slate-200 max-w-sm shadow-lg backdrop-blur-sm"}
			role="dialog"
			aria-labelledby="planet-title"
			aria-modal="false"
		>
			<div className="flex items-center justify-between mb-2">
				<div id="planet-title" className="font-semibold text-base flex items-center gap-2">
					<span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: colorHex }} />
					{planet.name}
				</div>
				<button
					onClick={onClose}
					className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-100"
					aria-label="Close info"
				>
					Close
				</button>
			</div>
			<div className="grid grid-cols-2 gap-x-4 gap-y-1">
				<div className="opacity-80">Orbit radius</div>
				<div>{planet.orbitRadiusPx} px</div>
				<div className="opacity-80">Orbital period</div>
				<div>{planet.orbitalPeriodDays} days</div>
			</div>
			<div className="mt-3" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
				{(() => {
					const base = "px-2 py-1 text-xs rounded transition-colors duration-150 cursor-pointer active:scale-95 focus:outline-none";
					const btnClass = showDetails
						? `${base} bg-purple-600 hover:bg-purple-500 text-white focus:ring-2 focus:ring-purple-400/60`
						: `${base} bg-slate-700 hover:bg-slate-500 text-slate-100 focus:ring-2 focus:ring-slate-400/60`;
					return (
						<button
							data-testid="btn-space-data"
							className={btnClass}
							onClick={() => setShowDetails((v) => !v)}
							aria-expanded={showDetails}
						>
							{showDetails ? "Hide space data ▲" : "Show space data ▼"}
						</button>
					);
				})()}

				{/* Secondary toggles: Space weather and Astronomy */}
				<div className="mt-2 flex gap-2">
					{(() => {
						const base = "px-2 py-1 text-xs rounded transition-colors duration-150 cursor-pointer active:scale-95 focus:outline-none";
						const cls = showWeather
							? `${base} bg-amber-600 hover:bg-amber-500 text-white focus:ring-2 focus:ring-amber-400/60`
							: `${base} bg-slate-700 hover:bg-slate-500 text-slate-100 focus:ring-2 focus:ring-slate-400/60`;
						return (
							<button data-testid="btn-space-weather" className={cls} onClick={() => setShowWeather((v) => !v)} aria-expanded={showWeather}>
								{showWeather ? "Hide space weather ▲" : `Space weather ▼${weatherCount !== null ? ` (${weatherCount})` : ''}`}
							</button>
						);
					})()}
					{(() => {
						const base = "px-2 py-1 text-xs rounded transition-colors duration-150 cursor-pointer active:scale-95 focus:outline-none";
						const cls = showAstronomy
							? `${base} bg-cyan-600 hover:bg-cyan-500 text-white focus:ring-2 focus:ring-cyan-400/60`
							: `${base} bg-slate-700 hover:bg-slate-500 text-slate-100 focus:ring-2 focus:ring-slate-400/60`;
						return (
							<button data-testid="btn-astronomy" className={cls} onClick={() => setShowAstronomy((v) => !v)} aria-expanded={showAstronomy}>
								{showAstronomy ? "Hide astronomy ▲" : `Astronomy ▼${astroSummary ? ` (${astroSummary})` : ''}`}
							</button>
						);
					})()}
				</div>

				{showDetails && (
					<div className="mt-2">
						{error && <div className="text-xs text-red-300">{error}</div>}
						{!details && !error && <div className="text-xs text-slate-400">Loading…</div>}
						{details && (
							<>
								<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
									<div className="opacity-80">Mean radius</div>
									<div>{details.meanRadiusKm ? `${details.meanRadiusKm} km` : "—"}</div>
									<div className="opacity-80">Mass</div>
									<div>{details.massKg ? `${Number(details.massKg).toExponential(2)} kg` : "—"}</div>
									<div className="opacity-80">Gravity</div>
									<div>{details.gravity ? `${details.gravity} m/s²` : "—"}</div>
									<div className="opacity-80">Density</div>
									<div>{details.density ? `${details.density} g/cm³` : "—"}</div>
									<div className="opacity-80">Sid. rotation</div>
									<div>{details.sideralRotationHours ? `${details.sideralRotationHours} h` : "—"}</div>
									<div className="opacity-80">Sid. orbit</div>
									<div>{details.sideralOrbitDays ? `${details.sideralOrbitDays} d` : "—"}</div>
								</div>
								<div className="mt-2 text-[10px] opacity-70">Source: {details.source}</div>
							</>
						)}
					</div>
				)}

				{/* Independent sections controlled by their own buttons */}
				{showWeather && (
					<div className="mt-3 border-t border-slate-700/60 pt-2">
						<div data-testid="section-space-weather" className="font-semibold text-xs mb-1">Space Weather {weatherLoading ? <span className="opacity-70">(loading…)</span> : null}</div>
						<SpaceWeatherList onLoadingChange={setWeatherLoading} />
					</div>
				)}
				{showAstronomy && (
					<div className="mt-3 border-t border-slate-700/60 pt-2">
						<div data-testid="section-astronomy" className="font-semibold text-xs mb-1">Astronomy (New York) {astroLoading ? <span className="opacity-70">(loading…)</span> : null}</div>
						<AstronomyMini lat={40.7128} lon={-74.0060} onLoadingChange={setAstroLoading} />
					</div>
				)}
			</div>
		</div>
	);
}



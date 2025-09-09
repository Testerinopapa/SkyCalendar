"use client";

import { useEffect, useState } from "react";
import type { PlanetDetail } from "@/types/domain";

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
				{details && (
					<>
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
					</>
				)}
			</div>
			{error && <div className="mt-2 text-xs text-red-300">{error}</div>}
			{!details && !error && <div className="mt-2 text-xs text-slate-400">Loading…</div>}
			{details && (
				<div className="mt-2 text-[10px] opacity-70">Source: {details.source}</div>
			)}
		</div>
	);
}



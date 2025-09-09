"use client";

import { useEffect, useState } from "react";

export default function AstronomyMini({ lat, lon, onLoadingChange }: { lat: number; lon: number; onLoadingChange?: (loading: boolean) => void }) {
	const [data, setData] = useState<any | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let alive = true;
		const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
		onLoadingChange?.(true);
		fetch(`/api/astronomy?${params.toString()}`)
			.then(async (r) => {
				if (!alive) return;
				if (!r.ok) throw new Error(String(r.status));
				const d = await r.json();
				setData(d);
			})
			.catch(() => alive && setError("Failed to load astronomy"))
			.finally(() => alive && onLoadingChange?.(false));
		return () => { alive = false };
	}, [lat, lon]);

	if (error) return <div className="text-xs text-red-300">{error}</div>;
	if (!data) return <div className="text-xs text-slate-400">Loading…</div>;
	const d = data?.daily ?? {};
	return (
		<div className="text-xs space-y-1">
			<div>Sunrise: <span className="opacity-80">{d.sunrise?.[0] ?? "—"}</span></div>
			<div>Sunset: <span className="opacity-80">{d.sunset?.[0] ?? "—"}</span></div>
			<div>Moonrise: <span className="opacity-80">{d.moonrise?.[0] ?? "—"}</span></div>
			<div>Moonset: <span className="opacity-80">{d.moonset?.[0] ?? "—"}</span></div>
			<div>Moon phase: <span className="opacity-80">{d.moon_phase?.[0] ?? "—"}</span></div>
			<div>Illumination: <span className="opacity-80">{d.moon_illumination?.[0] ?? "—"}</span></div>
		</div>
	);
}

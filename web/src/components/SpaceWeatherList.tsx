"use client";

import { useEffect, useState } from "react";

type SpaceWeatherEvent = {
	id: string;
	kind: "flare" | "cme" | "geomagnetic" | "radiation";
	title?: string;
	startAt: string;
	endAt?: string;
	source: string;
	severity?: string;
	link?: string;
};

export default function SpaceWeatherList() {
	const [events, setEvents] = useState<SpaceWeatherEvent[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let alive = true;
		fetch("/api/space-weather")
			.then(async (r) => {
				if (!alive) return;
				if (!r.ok) throw new Error(String(r.status));
				const data = await r.json();
				setEvents(Array.isArray(data) ? data.slice(0, 6) : []);
			})
			.catch(() => alive && setError("Failed to load space weather"));
		return () => { alive = false };
	}, []);

	if (error) return <div className="text-xs text-red-300">{error}</div>;
	if (!events) return <div className="text-xs text-slate-400">Loading…</div>;
	if (events.length === 0) return <div className="text-xs text-slate-400">No recent events</div>;

	return (
		<ul className="space-y-1 text-xs">
			{events.map((e) => (
				<li key={e.id} className="flex items-center gap-2">
					<span className="inline-block px-1.5 py-0.5 rounded bg-slate-700/70 text-slate-200 capitalize">{e.kind}</span>
					<span className="truncate">{e.title || e.id}</span>
					<span className="opacity-70 ml-auto">{new Date(e.startAt).toLocaleString()}</span>
				</li>
			))}
		</ul>
	);
}

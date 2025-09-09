"use client";

import { useEffect, useState } from "react";

type Launch = {
	id: string;
	title: string;
	startAt: string;
};

export default function LaunchList() {
	const [launches, setLaunches] = useState<Launch[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let alive = true;
		fetch("/api/launches")
			.then((r) => r.json())
			.then((data) => {
				if (!alive) return;
				setLaunches(Array.isArray(data) ? data.slice(0, 8) : []);
			})
			.catch(() => alive && setError("Failed to load launches"));
		return () => { alive = false };
	}, []);

	return (
		<div className="text-slate-200">
			<h3 className="font-semibold mb-2">Upcoming Launches</h3>
			{error && <div className="text-red-300 text-xs mb-2">{error}</div>}
			{!launches && !error && <div className="text-slate-400 text-xs">Loading…</div>}
			{launches && launches.length === 0 && <div className="text-slate-400 text-xs">No data</div>}
			{launches && launches.length > 0 && (
				<ul className="space-y-2 max-h-64 overflow-auto pr-1">
					{launches.map((l) => (
						<li key={l.id} className="text-sm">
							<div className="font-medium truncate">{l.title}</div>
							<div className="text-xs opacity-80">{new Date(l.startAt).toLocaleString()}</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

import type { SpaceWeatherEvent } from "@/types/domain";

export function normalizeFlares(input: any[]): SpaceWeatherEvent[] {
	return (input || []).map((f) => ({
		id: `donki:flare:${f.flrID}`,
		kind: "flare",
		title: f.classType ? `Solar flare ${f.classType}` : "Solar flare",
		startAt: f.beginTime,
		endAt: f.endTime ?? undefined,
		source: "nasa-donki",
		severity: f.classType ?? undefined,
		link: f.link ?? undefined,
	}));
}

export function normalizeCmes(input: any[]): SpaceWeatherEvent[] {
	return (input || []).map((c) => ({
		id: `donki:cme:${c.activityID}`,
		kind: "cme",
		title: c.note ? `CME: ${c.note}` : "Coronal Mass Ejection",
		startAt: c.startTime,
		source: "nasa-donki",
		link: c.link ?? undefined,
	}));
}

export function normalizeGsts(input: any[]): SpaceWeatherEvent[] {
	return (input || []).map((g) => ({
		id: `donki:gst:${g.gstID ?? g.startTime}`,
		kind: "geomagnetic",
		title: g.maxKpIndex ? `Geomagnetic storm Kp=${g.maxKpIndex}` : "Geomagnetic storm",
		startAt: g.startTime,
		endAt: g.endTime ?? undefined,
		source: "nasa-donki",
		severity: g.maxKpIndex ? String(g.maxKpIndex) : undefined,
		link: g.link ?? undefined,
	}));
}

export function normalizeSep(input: any[]): SpaceWeatherEvent[] {
	return (input || []).map((s) => ({
		id: `donki:sep:${s.sepID ?? s.eventTime ?? s.startTime}`,
		kind: "radiation",
		title: s.intensity ? `SEP event intensity ${s.intensity}` : "Solar energetic particle event",
		startAt: s.eventTime ?? s.startTime ?? s.beginTime ?? s.date ?? new Date().toISOString(),
		source: "nasa-donki",
		link: s.link ?? undefined,
	}));
}

export function normalizeRbe(input: any[]): SpaceWeatherEvent[] {
	return (input || []).map((r) => ({
		id: `donki:rbe:${r.rbeID ?? r.beginTime ?? r.startTime}`,
		kind: "radiation",
		title: r.impact ? `Radio blackout (${r.impact})` : "Radio blackout",
		startAt: r.beginTime ?? r.startTime ?? r.date ?? new Date().toISOString(),
		source: "nasa-donki",
		link: r.link ?? undefined,
	}));
}

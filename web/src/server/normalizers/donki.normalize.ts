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

import { donkiGet } from "@/server/providers/donki";
import { normalizeFlares, normalizeCmes } from "@/server/normalizers/donki.normalize";
import type { SpaceWeatherEvent } from "@/types/domain";

function ymd(d: Date) {
	return d.toISOString().slice(0, 10);
}

export async function ingestRecentSpaceWeather(): Promise<SpaceWeatherEvent[]> {
	const endDate = new Date();
	const startDate = new Date(endDate.getTime() - 3 * 86400000); // last 3 days for fresher data
	const [flares, cmes] = await Promise.all([
		donkiGet<any[]>("/FLR", { startDate: ymd(startDate), endDate: ymd(endDate) }).catch(() => []),
		donkiGet<any[]>("/CME", { startDate: ymd(startDate), endDate: ymd(endDate) }).catch(() => []),
	]);
	return [...normalizeFlares(flares || []), ...normalizeCmes(cmes || [])];
}

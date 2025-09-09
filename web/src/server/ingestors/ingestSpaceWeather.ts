import { donkiGet } from "@/server/providers/donki";
import { normalizeFlares, normalizeCmes } from "@/server/normalizers/donki.normalize";
import type { SpaceWeatherEvent } from "@/types/domain";

export async function ingestRecentSpaceWeather(): Promise<SpaceWeatherEvent[]> {
	const now = new Date();
	const start = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10); // last 7 days
	const end = new Date(now.getTime() + 1 * 86400000).toISOString().slice(0, 10);
	const [flares, cmes] = await Promise.all([
		donkiGet<any[]>("/FLR", { startDate: start, endDate: end }),
		donkiGet<any[]>("/CME", { startDate: start, endDate: end }),
	]);
	return [...normalizeFlares(flares), ...normalizeCmes(cmes)];
}

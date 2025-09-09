import { donkiGet } from "@/server/providers/donki";
import { normalizeFlares, normalizeCmes, normalizeGsts, normalizeSep, normalizeRbe } from "@/server/normalizers/donki.normalize";
import type { SpaceWeatherEvent } from "@/types/domain";

function ymd(d: Date) {
	return d.toISOString().slice(0, 10);
}

export async function ingestRecentSpaceWeather(): Promise<SpaceWeatherEvent[]> {
	const endDate = new Date();
	const startDate = new Date(endDate.getTime() - 14 * 86400000); // last 14 days
	const params = { startDate: ymd(startDate), endDate: ymd(endDate) } as const;
	const [flares, cmes, gsts, seps, rbes] = await Promise.all([
		donkiGet<any[]>("/FLR", params).catch(() => []),
		donkiGet<any[]>("/CME", params).catch(() => []),
		donkiGet<any[]>("/GST", params).catch(() => []),
		donkiGet<any[]>("/SEP", params).catch(() => []),
		donkiGet<any[]>("/RBE", params).catch(() => []),
	]);
	return [
		...normalizeFlares(flares || []),
		...normalizeCmes(cmes || []),
		...normalizeGsts(gsts || []),
		...normalizeSep(seps || []),
		...normalizeRbe(rbes || []),
	].sort((a, b) => (new Date(b.startAt).getTime() - new Date(a.startAt).getTime()));
}

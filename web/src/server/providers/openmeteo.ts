const BASE = "https://api.open-meteo.com/v1/astronomy";

export async function openMeteoAstronomy(lat: number, lon: number, date?: string, timeoutMs = 5000): Promise<any> {
	const url = new URL(BASE);
	url.searchParams.set("latitude", String(lat));
	url.searchParams.set("longitude", String(lon));
	url.searchParams.set("daily", ["sunrise","sunset","moonrise","moonset","moon_phase","moon_illumination"].join(","));
	if (date) url.searchParams.set("start_date", date), url.searchParams.set("end_date", date);
	const controller = new AbortController();
	const t = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(url.toString(), { signal: controller.signal, headers: { "User-Agent": "maria-app" }, cache: "no-store" });
		if (!res.ok) throw new Error(`OpenMeteo ${res.status}`);
		return await res.json();
	} finally {
		clearTimeout(t);
	}
}

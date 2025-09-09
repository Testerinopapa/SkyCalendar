const BASE = "https://api.open-meteo.com/v1/astronomy";

function todayIso(): string {
	const d = new Date();
	return d.toISOString().slice(0, 10);
}

export async function openMeteoAstronomy(lat: number, lon: number, date?: string, timeoutMs = 5000): Promise<any> {
	const url = new URL(BASE);
	url.searchParams.set("latitude", String(lat));
	url.searchParams.set("longitude", String(lon));
	url.searchParams.set("daily", ["sunrise","sunset","moonrise","moonset","moon_phase","moon_illumination"].join(","));
	url.searchParams.set("timezone", "auto");
	const day = date || todayIso();
	url.searchParams.set("start_date", day);
	url.searchParams.set("end_date", day);
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

const BASE = "https://api.nasa.gov/DONKI";

function getApiKey() {
	return process.env.NASA_API_KEY || "DEMO_KEY";
}

export async function donkiGet<T>(path: string, params: Record<string, string | number | undefined> = {}, timeoutMs = 6000): Promise<T> {
	const url = new URL(BASE + path);
	url.searchParams.set("api_key", getApiKey());
	for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
	const controller = new AbortController();
	const t = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(url.toString(), { signal: controller.signal, headers: { "User-Agent": "maria-app" }, cache: "no-store" });
		if (!res.ok) throw new Error(`DONKI ${res.status}`);
		return (await res.json()) as T;
	} finally {
		clearTimeout(t);
	}
}

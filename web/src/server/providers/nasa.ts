import { providers } from "@/config/providers";

const cfg = providers.nasa;

export async function nasaGet<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
	const url = new URL(cfg.baseUrl + path);
	const apiKey = process.env.NASA_API_KEY || "DEMO_KEY";
	url.searchParams.set("api_key", apiKey);
	for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
	const controller = new AbortController();
	const t = setTimeout(() => controller.abort(), cfg.timeoutMs);
	try {
		const res = await fetch(url.toString(), { signal: controller.signal, headers: { "User-Agent": "maria-app" } });
		if (!res.ok) throw new Error(`NASA ${res.status}`);
		return (await res.json()) as T;
	} finally {
		clearTimeout(t);
	}
}

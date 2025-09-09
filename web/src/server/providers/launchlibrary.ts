import { providers } from "@/config/providers";

const cfg = providers.launchLibrary;

export async function llGet<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
	const url = new URL(cfg.baseUrl + path);
	for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
	const controller = new AbortController();
	const t = setTimeout(() => controller.abort(), cfg.timeoutMs);
	try {
		const res = await fetch(url.toString(), { signal: controller.signal, headers: { "User-Agent": "maria-app" } });
		if (!res.ok) throw new Error(`LL2 ${res.status}`);
		return (await res.json()) as T;
	} finally {
		clearTimeout(t);
	}
}

const BASE = "https://api.le-systeme-solaire.net/rest";

export async function lssGet<T>(path: string, params: Record<string, string | number | undefined> = {}, timeoutMs = 3000): Promise<T> {
	const url = new URL(BASE + path);
	for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
	const controller = new AbortController();
	const t = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(url.toString(), { signal: controller.signal, headers: { "User-Agent": "maria-app" }, cache: "no-store" });
		if (!res.ok) throw new Error(`LSS ${res.status}`);
		return (await res.json()) as T;
	} finally {
		clearTimeout(t);
	}
}

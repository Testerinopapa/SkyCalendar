const BASE = "https://api.le-systeme-solaire.net/rest";

export async function lssGet<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
	const url = new URL(BASE + path);
	for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
	const res = await fetch(url.toString(), { headers: { "User-Agent": "maria-app" } });
	if (!res.ok) throw new Error(`LSS ${res.status}`);
	return (await res.json()) as T;
}

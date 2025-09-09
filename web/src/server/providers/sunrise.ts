// Sunrise-Sunset.org fallback (no key). Times are in UTC when formatted=0

export async function getSunriseSunset(lat: number, lon: number, date?: string, timeoutMs = 5000): Promise<{ sunrise?: string; sunset?: string; civil_twilight_begin?: string; civil_twilight_end?: string } | null> {
  const url = new URL('https://api.sunrise-sunset.org/json');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lon));
  if (date) url.searchParams.set('date', date);
  url.searchParams.set('formatted', '0');
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal, headers: { 'User-Agent': 'maria-app' }, cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 'OK') return null;
    return json.results as any;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}



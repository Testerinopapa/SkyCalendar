import { NextResponse } from 'next/server'
import { lssGet } from '@/server/providers/lesysteme'
import { normalizeLssPlanet } from '@/server/normalizers/planet.normalize'
import { getFallbackPlanet } from '@/server/providers/planetsFallback'

const nameMap: Record<string, string> = {
	mercury: 'mercure',
	venus: 'venus',
	earth: 'terre',
	mars: 'mars',
	jupiter: 'jupiter',
	saturn: 'saturne',
	uranus: 'uranus',
	neptune: 'neptune',
};

export async function GET(_: Request, { params }: { params: { name: string } }) {
	try {
		const q = (params.name || '').toLowerCase();
		const key = nameMap[q] || q;
		try {
			const data = await lssGet<any>(`/bodies/${encodeURIComponent(key)}`);
			if (!data || data.error) {
				const fb = getFallbackPlanet(q);
				if (fb) return NextResponse.json(fb);
				return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
			}
			return NextResponse.json(normalizeLssPlanet(data));
		} catch {
			const fb = getFallbackPlanet(q);
			if (fb) return NextResponse.json(fb);
			return NextResponse.json({ ok: false }, { status: 502 })
		}
	} catch (e) {
		return NextResponse.json({ ok: false }, { status: 500 })
	}
}

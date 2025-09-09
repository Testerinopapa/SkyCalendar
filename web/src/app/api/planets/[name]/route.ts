import { NextResponse } from 'next/server'
import { lssGet } from '@/server/providers/lesysteme'
import { normalizeLssPlanet } from '@/server/normalizers/planet.normalize'

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
		const data = await lssGet<any>(`/bodies/${encodeURIComponent(key)}`);
		return NextResponse.json(normalizeLssPlanet(data));
	} catch (e) {
		return NextResponse.json({ ok: false }, { status: 500 })
	}
}

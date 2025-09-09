import { NextRequest, NextResponse } from 'next/server'
import { openMeteoAstronomy } from '@/server/providers/openmeteo'

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url)
		const lat = Number(searchParams.get('lat'))
		const lon = Number(searchParams.get('lon'))
		const date = searchParams.get('date') || undefined
		if (!isFinite(lat) || !isFinite(lon)) return NextResponse.json({ ok: false, error: 'latlon' }, { status: 400 })
		const data = await openMeteoAstronomy(lat, lon, date)
		return NextResponse.json(data)
	} catch (e) {
		return NextResponse.json({ ok: false }, { status: 502 })
	}
}

import { NextResponse } from 'next/server'
import { ingestRecentSpaceWeather } from '@/server/ingestors/ingestSpaceWeather'

export async function GET() {
	try {
		const events = await ingestRecentSpaceWeather()
		return NextResponse.json(events)
	} catch (e) {
		return NextResponse.json({ ok: false }, { status: 502 })
	}
}

import { NextResponse } from 'next/server'
import { ingestUpcomingLaunches } from '@/server/ingestors/ingestLaunches'
import { SimpleTTLCache } from '@/lib/cache'
import type { Event } from '@/types/domain'

const cache = new SimpleTTLCache<string, Event[]>(60_000)

export async function GET() {
	try {
		const cached = cache.get('launches')
		if (cached) return NextResponse.json(cached)
		const launches = await ingestUpcomingLaunches()
		cache.set('launches', launches)
		return NextResponse.json(launches)
	} catch (e) {
		return NextResponse.json({ ok: false }, { status: 500 })
	}
}

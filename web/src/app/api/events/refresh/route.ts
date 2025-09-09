import { NextResponse } from 'next/server'
import { loadUpcomingEvents } from '@/server/services/eventsAggregator'

export async function POST() {
	try {
		const events = await loadUpcomingEvents()
		return NextResponse.json({ ok: true, count: events.length })
	} catch (e) {
		return NextResponse.json({ ok: false }, { status: 500 })
	}
}

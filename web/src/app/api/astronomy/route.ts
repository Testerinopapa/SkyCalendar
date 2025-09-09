import { NextRequest, NextResponse } from 'next/server'
import { openMeteoAstronomy } from '@/server/providers/openmeteo'
import { getSunriseSunset } from '@/server/providers/sunrise'

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url)
		const lat = Number(searchParams.get('lat'))
		const lon = Number(searchParams.get('lon'))
		const date = searchParams.get('date') || undefined
		if (!isFinite(lat) || !isFinite(lon)) return NextResponse.json({ ok: false, error: 'latlon' }, { status: 400 })
		const data = await openMeteoAstronomy(lat, lon, date)
		// If daily fields are missing or nulls, attempt fallback for sunrise/sunset
		const daily = data?.daily ?? {}
		const sr = daily.sunrise?.[0]
		const ss = daily.sunset?.[0]
		if (!sr || !ss) {
			const alt = await getSunriseSunset(lat, lon, date)
			if (alt) {
				data.daily = data.daily || {}
				data.daily.sunrise = [alt.sunrise ?? null]
				data.daily.sunset = [alt.sunset ?? null]
			}
		}
		return NextResponse.json(data)
	} catch (e) {
		// Graceful fallback: minimal structure with dashes
		return NextResponse.json({ daily: { sunrise: [null], sunset: [null], moonrise: [null], moonset: [null], moon_phase: [null], moon_illumination: [null] } })
	}
}

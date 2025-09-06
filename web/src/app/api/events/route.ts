import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const type = searchParams.get('type') as
    | 'moon'
    | 'meteor'
    | 'eclipse'
    | 'launch'
    | 'other'
    | null

  const where: any = {}
  if (from || to) {
    where.startAt = {}
    if (from) where.startAt.gte = new Date(from)
    if (to) where.startAt.lte = new Date(to)
  }
  if (type) where.type = type

  const events = await prisma.event.findMany({
    where,
    orderBy: { startAt: 'asc' }
  })

  return NextResponse.json(events)
}



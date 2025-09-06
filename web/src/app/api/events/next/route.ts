import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const now = new Date()
  const next = await prisma.event.findFirst({
    where: { startAt: { gte: now } },
    orderBy: { startAt: 'asc' }
  })
  return NextResponse.json(next)
}



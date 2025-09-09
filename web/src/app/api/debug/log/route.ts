import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const LOG_DIR = path.join(process.cwd(), 'logs')

function ensureLogDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
  } catch {}
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({ raw: 'non-json' }))
    const line = `[planet-click] ${new Date().toISOString()} ${JSON.stringify(body)}\n`
    // Print to terminal
    // eslint-disable-next-line no-console
    console.log(line.trim())
    // Persist to logs folder
    ensureLogDir()
    const file = path.join(LOG_DIR, 'interactions.log')
    fs.appendFile(file, line, () => {})
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}



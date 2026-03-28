import { NextRequest, NextResponse } from 'next/server'

const RENDER_URL = process.env.RENDER_API_URL || 'https://forged-by-freedom-api-nm4f.onrender.com'

/**
 * GET /api/cron/keep-alive
 *
 * Pings the Render backend to prevent cold starts.
 * Render free tier spins down after 15 min of inactivity.
 * This runs daily to keep it warm during business hours.
 *
 * Also called by other crons as a side-effect to keep Render warm.
 */
export async function GET(_request: NextRequest) {
  try {
    const start = Date.now()

    const res = await fetch(`${RENDER_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(30000),
    })

    const elapsed = Date.now() - start
    const body = await res.json().catch(() => ({}))
    const wasColdStart = elapsed > 5000

    return NextResponse.json({
      success: true,
      render_status: res.status,
      render_uptime: body.uptime || null,
      response_time_ms: elapsed,
      was_cold_start: wasColdStart,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

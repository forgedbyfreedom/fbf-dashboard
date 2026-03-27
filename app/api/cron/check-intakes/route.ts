import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fbf-dashboard.vercel.app'

/**
 * GET /api/cron/check-intakes
 *
 * Polls for completed intakes that need program generation.
 * Called by Vercel Cron every 15 minutes or manually.
 *
 * Looks for client_intakes records where:
 *   - waiver_accepted = true
 *   - completed_at IS NOT NULL
 *   - program_status IS NULL OR program_status = 'pending'
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret or allow localhost
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow Vercel cron (no auth needed on Vercel)
      const isVercelCron = request.headers.get('x-vercel-cron') === '1'
      if (!isVercelCron) {
        // Allow if no cron secret configured (development)
        if (cronSecret) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
      }
    }

    const supabase = createAdminClient()

    // Find completed intakes without a generated program
    const { data: pendingIntakes, error } = await supabase
      .from('client_intake')
      .select('id, client_id')
      .eq('waiver_accepted', true)
      .not('completed_at', 'is', null)
      .or('program_status.is.null,program_status.eq.pending')
      .limit(5) // Process up to 5 at a time

    if (error) {
      console.error('Error querying intakes:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!pendingIntakes || pendingIntakes.length === 0) {
      return NextResponse.json({ message: 'No pending intakes', processed: 0 })
    }

    const results: Array<{ client_id: string; status: string; error?: string }> = []

    for (const intake of pendingIntakes) {
      try {
        // Mark as pending to prevent duplicate processing
        await supabase
          .from('client_intake')
          .update({ program_status: 'pending' })
          .eq('id', intake.id)

        // Trigger the program generation webhook
        const response = await fetch(`${APP_URL}/api/webhooks/intake-completed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intake_id: intake.id }),
        })

        const data = await response.json()

        if (response.ok) {
          results.push({ client_id: intake.client_id, status: 'triggered' })
        } else {
          results.push({ client_id: intake.client_id, status: 'error', error: data.error })
        }
      } catch (err) {
        results.push({
          client_id: intake.client_id,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      message: `Processed ${results.length} intakes`,
      processed: results.length,
      results,
    })
  } catch (err) {
    console.error('Cron check-intakes error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

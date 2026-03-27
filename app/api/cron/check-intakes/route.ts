import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fbf-dashboard.vercel.app'

/**
 * GET /api/cron/check-intakes
 *
 * Polls for completed intakes that need program generation.
 * Called by Vercel Cron daily at 9 AM or manually.
 *
 * Checks BOTH intake tables:
 *   - client_intake (dashboard-created intakes, uses waiver_accepted + client_id)
 *   - client_intakes (Render/website intakes, uses waiver_signature + lead_id)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret or allow localhost
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const isVercelCron = request.headers.get('x-vercel-cron') === '1'
      if (!isVercelCron && cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const supabase = createAdminClient()
    const results: Array<{ id: string; source: string; status: string; error?: string }> = []

    // ── Check dashboard table (client_intake) ──
    const { data: dashboardIntakes } = await supabase
      .from('client_intake')
      .select('id, client_id')
      .eq('waiver_accepted', true)
      .not('completed_at', 'is', null)
      .or('program_status.is.null,program_status.eq.pending')
      .limit(5)

    for (const intake of dashboardIntakes || []) {
      try {
        await supabase
          .from('client_intake')
          .update({ program_status: 'generating' })
          .eq('id', intake.id)

        const response = await fetch(`${APP_URL}/api/webhooks/intake-completed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intake_id: intake.id }),
        })
        const data = await response.json()
        results.push({
          id: intake.client_id,
          source: 'dashboard',
          status: response.ok ? 'triggered' : 'error',
          error: response.ok ? undefined : data.error,
        })
      } catch (err) {
        results.push({
          id: intake.client_id,
          source: 'dashboard',
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    // ── Check Render table (client_intakes) ──
    // This table uses waiver_signature (not waiver_accepted) and lead_id (not client_id)
    const { data: renderIntakes } = await supabase
      .from('client_intakes')
      .select('id, lead_id, full_name, waiver_signature')
      .not('waiver_signature', 'is', null)
      .or('program_status.is.null,program_status.eq.pending')
      .limit(5)

    for (const intake of renderIntakes || []) {
      try {
        await supabase
          .from('client_intakes')
          .update({ program_status: 'generating' })
          .eq('id', intake.id)

        // The Render webhook handler lives on the Render backend
        // But we can also trigger our own webhook with the intake data
        const renderUrl = process.env.RENDER_API_URL || 'https://forged-by-freedom-api-nm4f.onrender.com'
        const adminKey = process.env.ADMIN_KEY || ''

        const response = await fetch(`${renderUrl}/api/generate-program`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminKey,
          },
          body: JSON.stringify({ intake_id: intake.id }),
        })

        let status = 'triggered'
        let error: string | undefined

        if (!response.ok) {
          const text = await response.text().catch(() => 'Unknown error')
          status = 'error'
          error = text

          // Reset so it can be retried
          await supabase
            .from('client_intakes')
            .update({ program_status: 'pending' })
            .eq('id', intake.id)
        }

        results.push({
          id: intake.lead_id || intake.full_name || intake.id,
          source: 'render',
          status,
          error,
        })
      } catch (err) {
        // Reset on error
        await supabase
          .from('client_intakes')
          .update({ program_status: 'pending' })
          .eq('id', intake.id)

        results.push({
          id: intake.lead_id || intake.full_name || intake.id,
          source: 'render',
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const totalProcessed = results.length
    if (totalProcessed === 0) {
      return NextResponse.json({ message: 'No pending intakes', processed: 0 })
    }

    // Send ntfy summary
    const ntfyTopic = process.env.NTFY_TOPIC || 'fbf-leads-bryan'
    const triggered = results.filter(r => r.status === 'triggered').length
    const errors = results.filter(r => r.status === 'error').length
    if (totalProcessed > 0) {
      await fetch(`https://ntfy.sh/${ntfyTopic}`, {
        method: 'POST',
        headers: {
          Title: `📋 Intake Cron: ${triggered} triggered, ${errors} errors`,
          Priority: errors > 0 ? 'high' : 'default',
          Tags: errors > 0 ? 'warning' : 'clipboard',
        },
        body: results.map(r => `${r.source}: ${r.id} → ${r.status}${r.error ? ` (${r.error})` : ''}`).join('\n'),
      }).catch(() => {})
    }

    return NextResponse.json({
      message: `Processed ${totalProcessed} intakes`,
      processed: totalProcessed,
      results,
    })
  } catch (err) {
    console.error('Cron check-intakes error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

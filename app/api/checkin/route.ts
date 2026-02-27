import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeFlags, saveFlags } from '@/lib/flags'
import { updateClientMetrics } from '@/lib/metrics'
import { triggerN8nWebhook } from '@/lib/n8n'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, ...checkinData } = body

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    // Validate token
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const supabase = createAdminClient()

    const { data: link, error: linkError } = await supabase
      .from('client_links')
      .select('client_id, clients(id, organization_id, target_steps)')
      .eq('token_hash', tokenHash)
      .eq('status', 'active')
      .single()

    if (linkError || !link) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    const clientId = link.client_id
    const today = new Date().toISOString().split('T')[0]

    // Upsert check-in (same day = update)
    const { data: checkin, error: checkinError } = await supabase
      .from('checkins')
      .upsert(
        {
          client_id: clientId,
          date: today,
          ...checkinData,
        },
        { onConflict: 'client_id,date' }
      )
      .select()
      .single()

    if (checkinError) {
      console.error('Checkin error:', checkinError)
      return NextResponse.json({ error: 'Failed to save check-in' }, { status: 500 })
    }

    // Compute flags and update metrics (don't block response)
    const clientInfo = link.clients as unknown as { id: string; organization_id: string; target_steps: number | null }

    Promise.all([
      computeFlags(supabase, {
        client_id: clientId,
        organization_id: clientInfo.organization_id,
        target_steps: clientInfo.target_steps,
      }).then(flags => {
        saveFlags(supabase, clientId, flags)
        // Trigger webhook for red flags
        const redFlags = flags.filter(f => f.severity === 'red')
        if (redFlags.length > 0) {
          triggerN8nWebhook('flag.red', { client_id: clientId, flags: redFlags })
        }
      }),
      updateClientMetrics(supabase, clientId),
      triggerN8nWebhook('checkin.created', { client_id: clientId, date: today, checkin_id: checkin.id }),
    ]).catch(err => console.error('Post-checkin processing error:', err))

    return NextResponse.json({ success: true, checkin_id: checkin.id })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

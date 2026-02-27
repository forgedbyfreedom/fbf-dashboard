import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const secret = request.headers.get('x-webhook-secret')
    if (process.env.N8N_WEBHOOK_SECRET && secret !== process.env.N8N_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, data } = body

    const supabase = createAdminClient()

    switch (action) {
      case 'get_missed_clients': {
        // Returns clients who haven't checked in within the specified hours
        const hours = data?.hours || 48
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

        const { data: metrics } = await supabase
          .from('client_metrics')
          .select('*, clients(first_name, last_name, email)')
          .or(`last_checkin_at.is.null,last_checkin_at.lt.${cutoff}`)

        return NextResponse.json({ clients: metrics || [] })
      }

      case 'get_client_summary': {
        // Returns weekly summary for a specific client
        const clientId = data?.client_id
        if (!clientId) return NextResponse.json({ error: 'client_id required' }, { status: 400 })

        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data: checkins } = await supabase
          .from('checkins')
          .select('*')
          .eq('client_id', clientId)
          .gte('date', sevenDaysAgo.toISOString().split('T')[0])
          .order('date', { ascending: true })

        const { data: metrics } = await supabase
          .from('client_metrics')
          .select('*')
          .eq('client_id', clientId)
          .single()

        return NextResponse.json({ checkins: checkins || [], metrics })
      }

      case 'add_coach_note': {
        // Add automated coach note (from n8n workflow)
        const { client_id, coach_user_id, note, action_items } = data || {}
        if (!client_id || !note) {
          return NextResponse.json({ error: 'client_id and note required' }, { status: 400 })
        }

        const { error } = await supabase.from('coach_notes').insert({
          client_id,
          coach_user_id: coach_user_id || null,
          note,
          action_items: action_items || [],
        })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

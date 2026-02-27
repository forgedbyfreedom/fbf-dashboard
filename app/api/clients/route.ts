import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { triggerN8nWebhook } from '@/lib/n8n'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { first_name, last_name, email, phone, target_calories, target_protein, target_steps } = body

    if (!first_name || !last_name) {
      return NextResponse.json({ error: 'First and last name required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Get user's org (use admin client to bypass RLS)
    const { data: membership } = await adminSupabase
      .from('org_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Create client
    const { data: client, error } = await adminSupabase
      .from('clients')
      .insert({
        organization_id: membership.organization_id,
        first_name,
        last_name,
        email,
        phone,
        target_calories: target_calories || null,
        target_protein: target_protein || null,
        target_steps: target_steps || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Assign to current coach
    await adminSupabase.from('client_coach_assignments').insert({
      client_id: client.id,
      coach_user_id: user.id,
    })

    // Create initial metrics row
    await adminSupabase.from('client_metrics').insert({
      client_id: client.id,
      coach_user_id: user.id,
    })

    // Generate magic link token
    const rawToken = crypto.randomUUID() + crypto.randomUUID()
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawToken))
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    await adminSupabase.from('client_links').insert({
      client_id: client.id,
      token_hash: tokenHash,
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const checkinUrl = `${appUrl}/checkin/${rawToken}`

    // Trigger webhook
    triggerN8nWebhook('client.created', {
      client_id: client.id,
      first_name,
      last_name,
      email,
      coach_id: user.id,
    })

    return NextResponse.json({ client, checkin_url: checkinUrl })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

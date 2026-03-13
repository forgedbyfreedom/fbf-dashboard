import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (user && !error) return user
  }
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// POST /api/client/setup-coach
// Creates a client record for a coach/admin user so they can track their own data
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // Verify they're an org member (coach or admin)
    const { data: membership } = await adminSupabase
      .from('org_members')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not an org member' }, { status: 403 })
    }

    // Check if they already have a client record
    const { data: existing } = await adminSupabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({ message: 'Client record already exists', client_id: existing.id })
    }

    // Get their profile for name
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    const fullName = profile?.full_name || user.email?.split('@')[0] || 'Coach'
    const nameParts = fullName.split(' ')
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || ''

    // Parse optional body for targets
    let body: Record<string, unknown> = {}
    try { body = await request.json() } catch {}

    // Create client record
    const { data: client, error } = await adminSupabase
      .from('clients')
      .insert({
        organization_id: membership.organization_id,
        user_id: user.id,
        first_name: (body.first_name as string) || firstName,
        last_name: (body.last_name as string) || lastName,
        email: user.email,
        phone: null,
        target_calories: (body.target_calories as number) || null,
        target_protein: (body.target_protein as number) || null,
        target_steps: (body.target_steps as number) || null,
        weigh_in_day: (body.weigh_in_day as string) || 'monday',
        current_supplements: [],
        current_peds: [],
        current_peptides: [],
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Self-assign as coach
    await adminSupabase.from('client_coach_assignments').insert({
      client_id: client.id,
      coach_user_id: user.id,
    })

    // Create metrics row
    await adminSupabase.from('client_metrics').insert({
      client_id: client.id,
      coach_user_id: user.id,
    })

    // Create streak row
    await adminSupabase.from('client_streaks').insert({
      client_id: client.id,
      current_streak: 0,
      best_streak: 0,
      total_checkins: 0,
    }).catch(() => {}) // Ignore if table doesn't exist yet

    return NextResponse.json({ message: 'Coach client record created', client })
  } catch (err) {
    console.error('[setup-coach] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

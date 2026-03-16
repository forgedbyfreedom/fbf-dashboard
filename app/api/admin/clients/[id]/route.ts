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

async function verifyAdmin(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return { error: 'Unauthorized', status: 401 }

  const adminSupabase = createAdminClient()
  const { data: membership } = await adminSupabase
    .from('org_members')
    .select('role, organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'org_admin') {
    return { error: 'Forbidden', status: 403 }
  }

  return { user, membership, adminSupabase }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { membership, adminSupabase } = auth
    const { id } = await params

    const { data: client, error } = await adminSupabase
      .from('clients')
      .select(`
        *,
        client_coach_assignments(coach_user_id, is_active, profiles:coach_user_id(full_name, email))
      `)
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .single()

    if (error || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get all check-ins
    const { data: checkins } = await adminSupabase
      .from('checkins')
      .select('*')
      .eq('client_id', id)
      .order('date', { ascending: false })
      .limit(50)

    // Get metrics
    const { data: metrics } = await adminSupabase
      .from('client_metrics')
      .select('*')
      .eq('client_id', id)
      .single()

    return NextResponse.json({
      client,
      checkins: checkins ?? [],
      metrics: metrics ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { membership, adminSupabase } = auth
    const { id } = await params

    const body = await request.json()
    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'timezone',
      'is_active', 'target_calories', 'target_protein', 'target_steps',
      'target_carbs', 'target_fats', 'target_water_oz', 'weigh_in_day',
      'current_supplements', 'current_peds', 'current_peptides',
      'program_name', 'program_raw_text', 'workout_program',
      'cardio_protocol', 'meal_plan', 'medical_protocol',
      'sms_opt_in', 'instagram_handle', 'leaderboard_opt_in',
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: client, error } = await adminSupabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ client })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

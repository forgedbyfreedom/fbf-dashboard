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

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { membership, adminSupabase } = auth

    // Get all org members (coaches + admins) with profiles
    const { data: members, error } = await adminSupabase
      .from('org_members')
      .select('user_id, role, profiles:user_id(id, full_name, email, avatar_url)')
      .eq('organization_id', membership.organization_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Count clients per coach
    const { data: assignments } = await adminSupabase
      .from('client_coach_assignments')
      .select('coach_user_id')
      .eq('is_active', true)
      .in('coach_user_id', (members ?? []).map(m => m.user_id))

    const clientCounts: Record<string, number> = {}
    for (const a of assignments ?? []) {
      clientCounts[a.coach_user_id] = (clientCounts[a.coach_user_id] || 0) + 1
    }

    const coaches = (members ?? []).map(m => ({
      ...m,
      client_count: clientCounts[m.user_id] || 0,
    }))

    return NextResponse.json({ coaches })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { membership, adminSupabase } = auth

    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Find profile by email
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'No user found with that email. They must create an account first.' }, { status: 404 })
    }

    // Check if already a member
    const { data: existing } = await adminSupabase
      .from('org_members')
      .select('id')
      .eq('organization_id', membership.organization_id)
      .eq('user_id', profile.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'User is already a member of this organization' }, { status: 409 })
    }

    const { error } = await adminSupabase.from('org_members').insert({
      organization_id: membership.organization_id,
      user_id: profile.id,
      role: 'coach',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

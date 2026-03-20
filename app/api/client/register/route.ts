import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Bryan's org + user ID (default coach for self-registered users)
const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID || ''
const DEFAULT_COACH_USER_ID = process.env.DEFAULT_COACH_USER_ID || ''

export async function POST(request: NextRequest) {
  try {
    const { email, password, first_name, last_name } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Get the org ID if not set via env — look up Bryan's org
    let orgId = DEFAULT_ORG_ID
    let coachId = DEFAULT_COACH_USER_ID

    if (!orgId || !coachId) {
      const { data: bryansOrg } = await adminSupabase
        .from('org_members')
        .select('organization_id, user_id')
        .eq('role', 'org_admin')
        .limit(1)
        .single()

      if (bryansOrg) {
        orgId = orgId || bryansOrg.organization_id
        coachId = coachId || bryansOrg.user_id
      }
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Organization not configured' }, { status: 500 })
    }

    // Create auth user
    const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `${first_name || ''} ${last_name || ''}`.trim() },
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'An account with this email already exists. Please sign in instead.' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Create client record
    const { error: clientError } = await adminSupabase
      .from('clients')
      .insert({
        user_id: newUser.user.id,
        organization_id: orgId,
        first_name: first_name || '',
        last_name: last_name || '',
        email,
        is_active: true,
      })

    if (clientError) {
      console.error('Client record error:', clientError)
      // Don't fail — auth user is created, client record can be fixed later
    }

    // Create org membership
    await adminSupabase.from('org_members').insert({
      user_id: newUser.user.id,
      organization_id: orgId,
      role: 'client',
    })

    // Assign to default coach
    if (coachId) {
      await adminSupabase.from('client_coach_assignments').insert({
        client_id: newUser.user.id,
        coach_user_id: coachId,
        is_active: true,
      })
    }

    return NextResponse.json({ success: true, message: 'Account created. You can now sign in.' })
  } catch (err) {
    console.error('Registration error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

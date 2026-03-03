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

    const { data: clients, error } = await adminSupabase
      .from('clients')
      .select(`
        *,
        client_coach_assignments(coach_user_id, is_active, profiles:coach_user_id(full_name, email)),
        client_metrics(status, adherence_7d)
      `)
      .eq('organization_id', membership.organization_id)
      .order('last_name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ clients: clients ?? [] })
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
    const { user, membership, adminSupabase } = auth

    const body = await request.json()
    const {
      first_name, last_name, email, phone,
      target_calories, target_protein, target_steps,
      weigh_in_day, coach_user_id,
    } = body

    if (!first_name || !last_name) {
      return NextResponse.json({ error: 'First and last name required' }, { status: 400 })
    }

    const { data: client, error } = await adminSupabase
      .from('clients')
      .insert({
        organization_id: membership.organization_id,
        first_name,
        last_name,
        email: email || null,
        phone: phone || null,
        target_calories: target_calories || null,
        target_protein: target_protein || null,
        target_steps: target_steps || null,
        weigh_in_day: weigh_in_day || 'monday',
        current_supplements: [],
        current_peds: [],
        current_peptides: [],
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Assign to specified coach or current user
    const assignTo = coach_user_id || user.id
    await adminSupabase.from('client_coach_assignments').insert({
      client_id: client.id,
      coach_user_id: assignTo,
    })

    await adminSupabase.from('client_metrics').insert({
      client_id: client.id,
      coach_user_id: assignTo,
    })

    return NextResponse.json({ client })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

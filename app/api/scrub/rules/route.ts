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

    const { data: rules, error } = await adminSupabase
      .from('scrub_rules')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .order('priority', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If no rules exist, seed defaults
    if (!rules || rules.length === 0) {
      await adminSupabase.rpc('seed_default_scrub_rules', {
        org_id: membership.organization_id,
        user_id: auth.user.id,
      })

      const { data: seeded } = await adminSupabase
        .from('scrub_rules')
        .select('*')
        .eq('organization_id', membership.organization_id)
        .order('priority', { ascending: false })

      return NextResponse.json({ rules: seeded ?? [] })
    }

    return NextResponse.json({ rules })
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
    const { name, description, field, operator, value, action, priority, is_active, condition_field, condition_operator, condition_value } = body

    if (!name || !field || !operator || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: rule, error } = await adminSupabase
      .from('scrub_rules')
      .insert({
        organization_id: membership.organization_id,
        name,
        description: description || null,
        field,
        operator,
        value: value || null,
        action,
        priority: priority ?? 0,
        is_active: is_active ?? true,
        created_by: user.id,
        condition_field: condition_field || null,
        condition_operator: condition_operator || null,
        condition_value: condition_value || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ rule })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

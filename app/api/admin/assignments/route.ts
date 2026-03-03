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

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { adminSupabase } = auth

    const { client_id, coach_user_id } = await request.json()
    if (!client_id || !coach_user_id) {
      return NextResponse.json({ error: 'client_id and coach_user_id required' }, { status: 400 })
    }

    // Deactivate existing assignments
    await adminSupabase
      .from('client_coach_assignments')
      .update({ is_active: false })
      .eq('client_id', client_id)

    // Upsert new assignment
    const { error: assignError } = await adminSupabase
      .from('client_coach_assignments')
      .upsert({
        client_id,
        coach_user_id,
        is_active: true,
      }, { onConflict: 'client_id,coach_user_id' })

    if (assignError) {
      return NextResponse.json({ error: assignError.message }, { status: 500 })
    }

    // Update metrics
    await adminSupabase
      .from('client_metrics')
      .update({ coach_user_id })
      .eq('client_id', client_id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

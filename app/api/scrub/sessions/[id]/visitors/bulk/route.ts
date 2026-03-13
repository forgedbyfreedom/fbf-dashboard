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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { user, membership, adminSupabase } = auth
    const { id } = await params

    // Verify session belongs to org
    const { data: session } = await adminSupabase
      .from('scrub_sessions')
      .select('id')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const body = await request.json()
    const { visitor_ids, override_result, override_reason } = body

    if (!visitor_ids || !Array.isArray(visitor_ids) || visitor_ids.length === 0) {
      return NextResponse.json({ error: 'visitor_ids required' }, { status: 400 })
    }

    if (!override_result || !['approved', 'denied'].includes(override_result)) {
      return NextResponse.json({ error: 'Invalid override_result' }, { status: 400 })
    }

    const { data: updated, error } = await adminSupabase
      .from('scrub_visitors')
      .update({
        override_result,
        override_by: user.id,
        override_reason: override_reason || null,
        override_at: new Date().toISOString(),
      })
      .in('id', visitor_ids)
      .eq('session_id', id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ updated: updated?.length ?? 0 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

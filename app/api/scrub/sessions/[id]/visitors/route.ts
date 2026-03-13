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

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const resultFilter = url.searchParams.get('result')
    const search = url.searchParams.get('search')

    const offset = (page - 1) * limit

    let query = adminSupabase
      .from('scrub_visitors')
      .select('*', { count: 'exact' })
      .eq('session_id', id)

    if (resultFilter && resultFilter !== 'all') {
      query = query.eq('result', resultFilter)
    }

    if (search) {
      query = query.or(`raw_data->>Visitor_Name.ilike.%${search}%,raw_data->>Inmate_Name.ilike.%${search}%`)
    }

    const { data: visitors, count, error } = await query
      .order('row_number')
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      visitors: visitors ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

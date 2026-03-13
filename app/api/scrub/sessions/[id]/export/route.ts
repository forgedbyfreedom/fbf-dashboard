import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import Papa from 'papaparse'

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
      .select('*')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get all visitors
    const allVisitors: Record<string, unknown>[] = []
    let offset = 0
    const batchSize = 1000

    while (true) {
      const { data: batch } = await adminSupabase
        .from('scrub_visitors')
        .select('*')
        .eq('session_id', id)
        .order('row_number')
        .range(offset, offset + batchSize - 1)

      if (!batch || batch.length === 0) break
      allVisitors.push(...batch)
      offset += batchSize
    }

    // Build export rows — original CSV columns + scrub results
    const exportRows = allVisitors.map(v => {
      const raw = v.raw_data as Record<string, string>
      const finalResult = (v.override_result as string) || (v.result as string)
      const denialReasons = v.denial_reasons as { rule_name: string; detail: string }[]

      return {
        ...raw,
        Scrub_Result: finalResult,
        Scrub_Denial_Reasons: denialReasons?.map(r => r.rule_name).join('; ') || '',
        Scrub_Override: v.override_result ? 'Yes' : 'No',
        Scrub_Override_Reason: (v.override_reason as string) || '',
      }
    })

    const csv = Papa.unparse(exportRows)

    // Mark session as exported
    await adminSupabase
      .from('scrub_sessions')
      .update({ status: 'exported', updated_at: new Date().toISOString() })
      .eq('id', id)

    const fileName = `scrub_${session.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

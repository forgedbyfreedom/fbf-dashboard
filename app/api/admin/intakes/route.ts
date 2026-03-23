import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-check'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // Verify org_admin
    const { data: membership } = await adminSupabase
      .from('org_members')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'org_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')

    // Single client detail mode
    if (clientId) {
      const { data: intake } = await adminSupabase
        .from('client_intake')
        .select('*')
        .eq('client_id', clientId)
        .single()

      return NextResponse.json({ intake: intake || null })
    }

    // List all active clients with intake status
    const { data: clients, error } = await adminSupabase
      .from('clients')
      .select('id, first_name, last_name, email, is_active')
      .eq('organization_id', membership.organization_id)
      .eq('is_active', true)
      .order('last_name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({ clients: [] })
    }

    // Get all intake records for these clients
    const clientIds = clients.map(c => c.id)
    const { data: intakes } = await adminSupabase
      .from('client_intake')
      .select('client_id, completed_at, waiver_accepted, waiver_accepted_at, waiver_ip, id, created_at')
      .in('client_id', clientIds)

    const intakeMap = new Map(
      (intakes || []).map(i => [i.client_id, i])
    )

    const result = clients.map(c => {
      const intake = intakeMap.get(c.id)
      return {
        client_id: c.id,
        name: `${c.first_name} ${c.last_name}`,
        email: c.email,
        intake_completed: !!intake?.completed_at,
        waiver_signed: !!intake?.waiver_accepted,
        waiver_signature: intake?.waiver_accepted ? `${c.first_name} ${c.last_name}` : null,
        waiver_signed_date: intake?.waiver_accepted_at || null,
        intake_date: intake?.completed_at || null,
        intake_id: intake?.id || null,
      }
    })

    return NextResponse.json({ clients: result })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

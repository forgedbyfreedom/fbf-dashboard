import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserFromRequest } from '@/lib/auth-check'
import { updateClientMetrics } from '@/lib/metrics'
import { updateStreaks } from '@/lib/gamification'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminSupabase = createAdminClient()

  // Verify org_admin
  const { data: membership } = await adminSupabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .single()
  if (membership?.role !== 'org_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Optional: specific client_id
  const body = await request.json().catch(() => ({}))
  const targetClientId = body.client_id

  if (targetClientId) {
    await updateClientMetrics(adminSupabase, targetClientId)
    await updateStreaks(adminSupabase, targetClientId)
    return NextResponse.json({ success: true, recomputed: 1 })
  }

  // Recompute for all active clients
  const { data: clients } = await adminSupabase
    .from('clients')
    .select('id')
    .eq('is_active', true)

  let count = 0
  for (const c of clients || []) {
    try {
      await updateClientMetrics(adminSupabase, c.id)
      await updateStreaks(adminSupabase, c.id)
      count++
    } catch (err) {
      console.error(`Metrics error for ${c.id}:`, err)
    }
  }

  return NextResponse.json({ success: true, recomputed: count })
}

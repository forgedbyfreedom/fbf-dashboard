import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // Get user's org
    const { data: membership } = await adminSupabase
      .from('org_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    let orgId = membership?.organization_id

    // If not an org member, check if they're a client
    if (!orgId) {
      const { data: clientData } = await adminSupabase
        .from('clients')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()
      orgId = clientData?.organization_id
    }

    if (!orgId) {
      return NextResponse.json({ users: [] })
    }

    // Get org members with profiles
    const { data: members } = await adminSupabase
      .from('org_members')
      .select('user_id')
      .eq('organization_id', orgId)
      .neq('user_id', user.id)

    const memberUserIds = (members || []).map(m => m.user_id)

    // Fetch profiles for all member user IDs
    let memberUsers: Array<{ id: string; full_name: string | null; email: string; avatar_url: string | null }> = []
    if (memberUserIds.length > 0) {
      const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', memberUserIds)

      memberUsers = (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email || '',
        avatar_url: p.avatar_url,
      }))
    }

    // Get clients with user accounts in same org
    const { data: clients } = await adminSupabase
      .from('clients')
      .select('user_id, first_name, last_name, email')
      .eq('organization_id', orgId)
      .not('user_id', 'is', null)
      .neq('user_id', user.id)

    const clientUsers = (clients || [])
      .filter(c => c.user_id && !memberUsers.some(u => u.id === c.user_id))
      .map(c => ({
        id: c.user_id!,
        full_name: `${c.first_name} ${c.last_name}`,
        email: c.email || '',
        avatar_url: null,
      }))

    return NextResponse.json({ users: [...memberUsers, ...clientUsers] })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

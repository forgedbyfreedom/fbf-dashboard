import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Must be a coach/admin
  const { data: membership } = await supabase
    .from('org_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Not a coach' }, { status: 403 })
  }

  // Check if already has a client record
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ client_id: existing.id })
  }

  // Get profile info
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const nameParts = (profile?.full_name || '').split(' ')
  const firstName = nameParts[0] || 'Coach'
  const lastName = nameParts.slice(1).join(' ') || ''

  // Create client record
  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      organization_id: membership.organization_id,
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      email: profile?.email || user.email,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create client record' }, { status: 500 })
  }

  // Self-assign as coach
  await supabase
    .from('client_coach_assignments')
    .insert({
      client_id: client.id,
      coach_user_id: user.id,
      is_active: true,
    })

  return NextResponse.json({ client_id: client.id })
}

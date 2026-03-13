import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import ClientManager from '@/components/portal/ClientManager'

export const dynamic = 'force-dynamic'

export default async function ClientEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Must be a coach
  const { data: membership } = await supabase
    .from('org_members')
    .select('role, organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/portal')

  const adminSupabase = createAdminClient()

  const { data: client } = await adminSupabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) redirect('/portal')

  // Get coach name
  let coachName = null
  const { data: assignment } = await adminSupabase
    .from('client_coach_assignments')
    .select('coach_user_id')
    .eq('client_id', id)
    .eq('is_active', true)
    .single()

  if (assignment) {
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('full_name')
      .eq('id', assignment.coach_user_id)
      .single()
    coachName = profile?.full_name || null
  }

  return <ClientManager client={client} coachName={coachName} />
}

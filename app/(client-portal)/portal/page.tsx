import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientDashboard from '@/components/portal/ClientDashboard'
import ClientSelector from '@/components/portal/ClientSelector'

export default async function ClientPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if user is a coach/admin
  const { data: membership } = await supabase
    .from('org_members')
    .select('role, organization_id')
    .eq('user_id', user.id)
    .single()

  const isCoach = !!membership
  const { client_id } = await searchParams

  // If coach is viewing a specific client
  if (isCoach && client_id) {
    return await renderClientDashboard(supabase, client_id, true)
  }

  // Check if user has their own client record
  const { data: ownClient } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // If coach with no client_id selected, show client list
  if (isCoach && !ownClient) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, is_active, last_weight')
      .eq('is_active', true)
      .order('last_name')

    return <ClientSelector clients={clients || []} />
  }

  // If coach who is also a client, show their own dashboard with client switcher
  if (isCoach && ownClient) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, is_active, last_weight')
      .eq('is_active', true)
      .order('last_name')

    const dashboard = await renderClientDashboard(supabase, ownClient.id, false)
    return (
      <div>
        <ClientSelector clients={clients || []} currentClientId={ownClient.id} />
        {dashboard}
      </div>
    )
  }

  // Regular client — show their own dashboard
  if (!ownClient) redirect('/')
  return await renderClientDashboard(supabase, ownClient.id, false)
}

async function renderClientDashboard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  showBackLink: boolean
) {
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (!client) redirect('/portal')

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: checkins } = await supabase
    .from('checkins')
    .select('*')
    .eq('client_id', client.id)
    .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })

  const { data: metrics } = await supabase
    .from('client_metrics')
    .select('*')
    .eq('client_id', client.id)
    .single()

  const { data: streak } = await supabase
    .from('client_streaks')
    .select('*')
    .eq('client_id', client.id)
    .single()

  let coachName = 'Your Coach'
  const { data: assignment } = await supabase
    .from('client_coach_assignments')
    .select('coach_user_id')
    .eq('client_id', client.id)
    .eq('is_active', true)
    .single()

  if (assignment) {
    const { data: coachProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', assignment.coach_user_id)
      .single()
    if (coachProfile?.full_name) coachName = coachProfile.full_name
  }

  return (
    <div>
      {showBackLink && (
        <a
          href="/portal"
          className="inline-flex items-center gap-2 text-sm text-[#888] hover:text-[#FF6A00] mb-4 transition-colors"
        >
          ← Back to All Clients
        </a>
      )}
      <ClientDashboard
        client={client}
        checkins={checkins || []}
        metrics={metrics}
        streak={streak}
        coachName={coachName}
      />
    </div>
  )
}

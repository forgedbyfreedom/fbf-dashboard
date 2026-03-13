import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientDashboard from '@/components/portal/ClientDashboard'

export default async function ClientPortalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get client record
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!client) redirect('/')

  // Get checkins (last 90 days)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: checkins } = await supabase
    .from('checkins')
    .select('*')
    .eq('client_id', client.id)
    .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })

  // Get metrics
  const { data: metrics } = await supabase
    .from('client_metrics')
    .select('*')
    .eq('client_id', client.id)
    .single()

  // Get streak
  const { data: streak } = await supabase
    .from('client_streaks')
    .select('*')
    .eq('client_id', client.id)
    .single()

  // Get coach name
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
    <ClientDashboard
      client={client}
      checkins={checkins || []}
      metrics={metrics}
      streak={streak}
      coachName={coachName}
    />
  )
}

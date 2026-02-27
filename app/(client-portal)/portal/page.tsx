import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientTrends from '@/components/portal/ClientTrends'

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

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">My Dashboard</h2>
      <ClientTrends client={client} checkins={checkins || []} />
    </div>
  )
}

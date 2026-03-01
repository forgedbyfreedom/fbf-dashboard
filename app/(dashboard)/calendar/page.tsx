import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GlobalCalendar from '@/components/dashboard/GlobalCalendar'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get current month's scheduled checkins
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`

  const { data: checkins } = await supabase
    .from('scheduled_checkins')
    .select('*, clients(id, first_name, last_name)')
    .eq('coach_user_id', user.id)
    .gte('scheduled_for', monthStart)
    .lte('scheduled_for', monthEnd)
    .order('scheduled_for', { ascending: true })

  // Get coach's assigned clients
  const { data: assignments } = await supabase
    .from('client_coach_assignments')
    .select('client_id, clients(id, first_name, last_name)')
    .eq('coach_user_id', user.id)

  const clients = (assignments || [])
    .map(a => a.clients as unknown as { id: string; first_name: string; last_name: string })
    .filter(Boolean)
    .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`))

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Calendar</h2>
      <GlobalCalendar initialCheckins={checkins || []} clients={clients} />
    </div>
  )
}

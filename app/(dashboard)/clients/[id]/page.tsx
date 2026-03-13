import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClientProfile from './ClientProfile'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Get client
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) notFound()

  // Get checkins (last 90 days)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: checkins } = await supabase
    .from('checkins')
    .select('*')
    .eq('client_id', id)
    .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })

  // Get flags
  const { data: flags } = await supabase
    .from('flags')
    .select('*')
    .eq('client_id', id)
    .is('resolved_at', null)
    .order('created_at', { ascending: false })

  // Get notes
  const { data: notes } = await supabase
    .from('coach_notes')
    .select('*, profiles(full_name)')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  // Get magic links
  const { data: links } = await supabase
    .from('client_links')
    .select('*')
    .eq('client_id', id)
    .eq('status', 'active')

  // Get metrics
  const { data: metrics } = await supabase
    .from('client_metrics')
    .select('*')
    .eq('client_id', id)
    .single()

  // Get scheduled checkins (current month)
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`

  const { data: scheduledCheckins } = await supabase
    .from('scheduled_checkins')
    .select('*, clients(id, first_name, last_name)')
    .eq('client_id', id)
    .gte('scheduled_for', monthStart)
    .lte('scheduled_for', monthEnd)
    .order('scheduled_for', { ascending: true })

  return (
    <ClientProfile
      client={client}
      checkins={checkins || []}
      flags={flags || []}
      notes={notes || []}
      links={links || []}
      metrics={metrics}
      scheduledCheckins={scheduledCheckins || []}
    />
  )
}

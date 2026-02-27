import { createClient } from '@/lib/supabase/server'
import ClientTable from '@/components/dashboard/ClientTable'
import AddClientButton from './AddClientButton'

export default async function DashboardHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Check if user is org_admin
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const isAdmin = membership?.role === 'org_admin'

  // Get metrics for assigned clients (or all for admin)
  let query = supabase
    .from('client_metrics')
    .select('*, clients(id, first_name, last_name)')
    .order('status', { ascending: true })

  if (!isAdmin) {
    query = query.eq('coach_user_id', user.id)
  }

  const { data: metrics } = await query

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Client Board</h2>
          <p className="text-sm text-[#888] mt-1 font-[family-name:var(--font-body)]">
            {metrics?.length || 0} active clients
          </p>
        </div>
        <AddClientButton />
      </div>

      <ClientTable metrics={metrics || []} />
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import IntakeOverview from '@/components/dashboard/IntakeOverview'

export const dynamic = 'force-dynamic'

export default async function IntakePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if user is org_admin or coach
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const isAdmin = membership?.role === 'org_admin'

  // Get all active clients (or just assigned ones for non-admin)
  let clientsQuery = supabase
    .from('clients')
    .select('id, first_name, last_name, email, phone, is_active, created_at')
    .eq('is_active', true)
    .order('first_name', { ascending: true })

  if (!isAdmin) {
    // Get clients assigned to this coach via client_metrics
    const { data: assigned } = await supabase
      .from('client_metrics')
      .select('client_id')
      .eq('coach_user_id', user.id)

    const assignedIds = assigned?.map(a => a.client_id) || []
    if (assignedIds.length > 0) {
      clientsQuery = clientsQuery.in('id', assignedIds)
    } else {
      return (
        <div className="text-center py-12">
          <p className="text-[#555]">No clients assigned.</p>
        </div>
      )
    }
  }

  const { data: clients } = await clientsQuery

  // Get all intake records
  const clientIds = clients?.map(c => c.id) || []
  let intakes: Array<{ client_id: string; completed_at: string | null; created_at: string }> = []

  if (clientIds.length > 0) {
    const { data: intakeData } = await supabase
      .from('client_intake')
      .select('client_id, completed_at, created_at')
      .in('client_id', clientIds)

    intakes = intakeData || []
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Client Intake Status</h2>
          <p className="text-sm text-[#888] mt-1">
            Track which clients have completed their onboarding intake forms.
          </p>
        </div>
      </div>

      <IntakeOverview clients={clients || []} intakes={intakes} />
    </div>
  )
}

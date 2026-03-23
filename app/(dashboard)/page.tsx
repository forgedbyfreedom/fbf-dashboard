import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ClientTable from '@/components/dashboard/ClientTable'
import AddClientButton from './AddClientButton'

export const dynamic = 'force-dynamic'

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
    .select('*, clients!inner(id, first_name, last_name, is_active)')
    .eq('clients.is_active', true)
    .order('status', { ascending: true })

  if (!isAdmin) {
    query = query.eq('coach_user_id', user.id)
  }

  const { data: metrics } = await query

  // Fetch intake status for all clients
  let intakeStatusMap: Record<string, { completed: boolean; waiver: boolean }> = {}
  if (metrics && metrics.length > 0) {
    const adminSupabase = createAdminClient()
    const clientIds = metrics.map((m: { client_id: string }) => m.client_id)
    const { data: intakes } = await adminSupabase
      .from('client_intake')
      .select('client_id, completed_at, waiver_accepted')
      .in('client_id', clientIds)

    if (intakes) {
      intakeStatusMap = Object.fromEntries(
        intakes.map(i => [i.client_id, { completed: !!i.completed_at, waiver: !!i.waiver_accepted }])
      )
    }
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-white tracking-widest">FORGED BY FREEDOM</h1>
        <p className="text-xs text-[#D4A017] font-semibold tracking-[0.3em] uppercase mt-2">Strength &bull; Discipline &bull; Freedom</p>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Client Board</h2>
          <p className="text-sm text-[#888] mt-1 font-[family-name:var(--font-body)]">
            {metrics?.length || 0} active clients
          </p>
        </div>
        <AddClientButton />
      </div>

      <ClientTable metrics={metrics || []} intakeStatusMap={intakeStatusMap} />

      {/* Coach Credentials */}
      <div className="mt-12 border-t border-[#2a2a2a] pt-8">
        <p className="text-center text-[10px] text-[#555] uppercase tracking-[0.2em] font-semibold mb-4">Nationally Certified — NASM</p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { label: 'NASM-CPT', status: 'Active' },
            { label: 'Nutrition Coach', status: 'Active' },
            { label: 'Physique & Bodybuilding', status: 'Certified' },
            { label: 'Nutrition (Level 4)', status: 'Certified' },
            { label: 'Meal Prep Specialist', status: 'Certified' },
          ].map((c) => (
            <span
              key={c.label}
              className="inline-flex items-center gap-1.5 bg-[#141414] border border-[#2a2a2a] rounded-full px-3 py-1.5 text-[11px] text-[#888] font-medium"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'Active' ? 'bg-green-500' : 'bg-blue-500'}`} />
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

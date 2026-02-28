import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminPanel from './AdminPanel'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if org_admin
  const { data: membership } = await supabase
    .from('org_members')
    .select('role, organization_id')
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'org_admin') {
    redirect('/')
  }

  const orgId = membership.organization_id

  // Get all coaches in org
  const { data: coaches } = await supabase
    .from('org_members')
    .select('*, profiles(id, full_name, email)')
    .eq('organization_id', orgId)

  // Get all clients in org
  const { data: clients } = await supabase
    .from('clients')
    .select('*, client_coach_assignments(coach_user_id, is_active, profiles(full_name))')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white tracking-wide">FORGED BY FREEDOM</h1>
        <p className="text-sm text-[#D4A017] font-medium tracking-widest uppercase">Strength & Nutrition</p>
      </div>
      <AdminPanel
        orgId={orgId}
        coaches={coaches || []}
        clients={clients || []}
      />
    </div>
  )
}

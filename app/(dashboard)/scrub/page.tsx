import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ScrubDashboard from '@/components/dashboard/scrub/ScrubDashboard'

export const dynamic = 'force-dynamic'

export default async function ScrubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('org_members')
    .select('role, organization_id')
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'org_admin') {
    redirect('/')
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-white tracking-widest">VISITOR SCRUB</h1>
        <p className="text-xs text-[#D4A017] font-semibold tracking-[0.3em] uppercase mt-2">
          Automated Visitor List Processing
        </p>
      </div>
      <ScrubDashboard orgId={membership.organization_id} />
    </div>
  )
}

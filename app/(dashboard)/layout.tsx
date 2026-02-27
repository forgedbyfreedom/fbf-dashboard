import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardNav from './DashboardNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile and org role
  const { data: membership } = await supabase
    .from('org_members')
    .select('role, organization_id, organizations(name)')
    .eq('user_id', user.id)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <DashboardNav
        userName={profile?.full_name || profile?.email || user.email || 'Coach'}
        orgName={(membership?.organizations as unknown as { name: string } | null)?.name || 'Organization'}
        role={membership?.role || 'coach'}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}

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
    .select('full_name, email, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt=""
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] max-w-[700px] opacity-[0.15] pointer-events-none select-none z-0"
      />
      <div className="relative z-10">
        <DashboardNav
          userName={profile?.full_name || profile?.email || user.email || 'Coach'}
          orgName={(membership?.organizations as unknown as { name: string } | null)?.name || 'Organization'}
          role={membership?.role || 'coach'}
          avatarUrl={profile?.avatar_url}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}

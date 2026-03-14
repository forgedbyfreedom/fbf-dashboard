import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirectTo=/portal')
  }

  // Check if user is a coach/admin
  const { data: membership } = await supabase
    .from('org_members')
    .select('role, organization_id')
    .eq('user_id', user.id)
    .single()

  const isCoach = !!membership

  // Check if this user is also a client
  const { data: client } = await supabase
    .from('clients')
    .select('first_name, last_name')
    .eq('user_id', user.id)
    .single()

  // If not a coach and not a client, redirect
  if (!isCoach && !client) {
    redirect('/')
  }

  const displayName = client
    ? `${client.first_name} ${client.last_name}`
    : user.email || 'User'

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Watermark logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt=""
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] max-w-[700px] opacity-[0.08] pointer-events-none select-none z-0"
      />
      <div className="relative z-10">
        <nav className="border-b border-[#2a2a2a] bg-[#141414]">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <a href="/portal" className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="FBF" className="h-8" />
                <span className="text-sm font-black text-white tracking-widest hidden sm:block">FORGED BY FREEDOM</span>
              </a>
              <div className="hidden sm:flex items-center gap-1">
                <a href="/portal" className="px-3 py-2 rounded-lg text-sm font-medium text-[#888] hover:text-white transition-colors">Dashboard</a>
                <a href="/portal/chat" className="px-3 py-2 rounded-lg text-sm font-medium text-[#888] hover:text-white transition-colors">Chat</a>
                <a
                  href="https://forgedbyfreedom.org/ai-coach"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-[#D4A017] hover:text-[#FF6A00] transition-colors"
                >
                  AI Coach
                </a>
                {isCoach && (
                  <Link href="/" className="px-3 py-2 rounded-lg text-sm font-medium bg-[#FF6A00]/10 text-[#FF6A00] hover:bg-[#FF6A00]/20 transition-colors">
                    Coach Dashboard
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white font-medium hidden sm:block">{displayName}</span>
              {/* Mobile nav links */}
              <div className="flex sm:hidden items-center gap-1">
                <a href="/portal" className="px-2 py-2 rounded-lg text-xs font-medium text-[#888] hover:text-white">Home</a>
                <a href="/portal/chat" className="px-2 py-2 rounded-lg text-xs font-medium text-[#888] hover:text-white">Chat</a>
                <a href="https://forgedbyfreedom.org/ai-coach" target="_blank" rel="noopener noreferrer" className="px-2 py-2 rounded-lg text-xs font-medium text-[#D4A017]">AI</a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}

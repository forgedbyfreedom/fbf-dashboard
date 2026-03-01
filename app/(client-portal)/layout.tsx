import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if this user is a client
  const { data: client } = await supabase
    .from('clients')
    .select('first_name, last_name')
    .eq('user_id', user.id)
    .single()

  if (!client) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <nav className="border-b border-[#2a2a2a] bg-[#141414]">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-[#FF6A00] tracking-wider">FBF</h1>
            <a href="/portal/chat" className="text-sm text-[#888] hover:text-white transition-colors">Accountability Chat</a>
            <a
              href="https://forgedbyfreedom.org/ai-coach"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#D4A017] hover:text-[#FF6A00] transition-colors"
            >
              Bloodwork AI
            </a>
          </div>
          <div className="text-sm text-white">
            {client.first_name} {client.last_name}
          </div>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}

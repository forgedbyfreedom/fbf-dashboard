import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import InstagramDashboard from '@/components/dashboard/InstagramDashboard'

export default async function InstagramPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const adminSupabase = createAdminClient()

  // Get scheduled/published posts
  const { data: posts } = await adminSupabase
    .from('instagram_posts')
    .select('*')
    .eq('coach_user_id', user.id)
    .order('scheduled_for', { ascending: false })
    .limit(50)

  // Get DM leads
  const { data: leads } = await adminSupabase
    .from('instagram_leads')
    .select('*, instagram_messages(id, direction, message, created_at)')
    .order('updated_at', { ascending: false })
    .limit(50)

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Instagram</h2>
      <InstagramDashboard initialPosts={posts || []} initialLeads={leads || []} />
    </div>
  )
}

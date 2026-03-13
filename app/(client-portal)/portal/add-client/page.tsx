import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AddClientForm from '@/components/portal/AddClientForm'

export const dynamic = 'force-dynamic'

export default async function AddClientPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Must be a coach
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/portal')

  return <AddClientForm />
}

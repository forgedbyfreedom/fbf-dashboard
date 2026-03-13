import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // Test admin client
    const { data: allClients, error: adminError } = await adminSupabase
      .from('clients')
      .select('id, first_name, last_name, email, is_active')
      .limit(20)

    // Test regular client
    const { data: myClients, error: regularError } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, is_active')
      .limit(20)

    return NextResponse.json({
      user_id: user.id,
      admin_query: { count: allClients?.length ?? 0, error: adminError?.message, clients: allClients },
      regular_query: { count: myClients?.length ?? 0, error: regularError?.message, clients: myClients },
      env_check: {
        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        has_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      }
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

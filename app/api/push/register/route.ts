import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'

async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (user && !error) return user
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token, platform } = await request.json()

    if (!token || !platform) {
      return NextResponse.json({ error: 'Token and platform required' }, { status: 400 })
    }

    if (!['ios', 'android'].includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Look up client_id for this user
    const { data: client } = await adminSupabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .single()

    // Upsert the push token
    const { error: upsertError } = await adminSupabase
      .from('push_tokens')
      .upsert(
        {
          user_id: user.id,
          client_id: client?.id ?? null,
          token,
          platform,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,token' }
      )

    if (upsertError) {
      console.error('Push token upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to register token' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

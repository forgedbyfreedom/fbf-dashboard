import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'

async function getUserFromRequest(request: NextRequest) {
  // Try Bearer token first (mobile app)
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

  // Fall back to cookie-based auth (web dashboard)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // Get client record for this user
    const { data: client, error: clientError } = await adminSupabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get metrics
    const { data: metrics } = await adminSupabase
      .from('client_metrics')
      .select('*')
      .eq('client_id', client.id)
      .single()

    // Get recent check-ins (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentCheckins } = await adminSupabase
      .from('checkins')
      .select('*')
      .eq('client_id', client.id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })

    // Get last weight from most recent check-in with weight
    const { data: lastWeightCheckin } = await adminSupabase
      .from('checkins')
      .select('weight_lbs')
      .eq('client_id', client.id)
      .not('weight_lbs', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      client: {
        ...client,
        last_weight: lastWeightCheckin?.weight_lbs ?? null,
      },
      metrics: metrics ?? null,
      recentCheckins: recentCheckins ?? [],
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

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

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // Get current client
    const { data: client, error: clientError } = await adminSupabase
      .from('clients')
      .select('id, organization_id, leaderboard_opt_in')
      .eq('user_id', user.id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const sort = new URL(request.url).searchParams.get('sort') || 'streak'

    // Get all opted-in clients in same org with their streaks and badge counts
    const { data: optedInClients } = await adminSupabase
      .from('clients')
      .select(`
        id, first_name, last_name,
        client_streaks (current_streak, best_streak, total_checkins),
        client_metrics (adherence_7d)
      `)
      .eq('organization_id', client.organization_id)
      .eq('leaderboard_opt_in', true)
      .eq('is_active', true)

    if (!optedInClients) {
      return NextResponse.json({ leaderboard: [], myRank: null })
    }

    // Get badge counts for each opted-in client
    const clientIds = optedInClients.map(c => c.id)
    const { data: badgeCounts } = await adminSupabase
      .from('client_badges')
      .select('client_id')
      .in('client_id', clientIds)

    const badgeCountMap: Record<string, number> = {}
    for (const bc of badgeCounts || []) {
      badgeCountMap[bc.client_id] = (badgeCountMap[bc.client_id] || 0) + 1
    }

    // Build leaderboard entries
    const entries = optedInClients.map(c => {
      const streakData = Array.isArray(c.client_streaks) ? c.client_streaks[0] : c.client_streaks
      const metricsData = Array.isArray(c.client_metrics) ? c.client_metrics[0] : c.client_metrics
      return {
        client_id: c.id,
        name: `${c.first_name} ${c.last_name.charAt(0)}.`,
        current_streak: streakData?.current_streak ?? 0,
        best_streak: streakData?.best_streak ?? 0,
        total_checkins: streakData?.total_checkins ?? 0,
        badge_count: badgeCountMap[c.id] || 0,
        adherence_7d: metricsData?.adherence_7d ?? 0,
      }
    })

    // Sort based on requested criteria
    entries.sort((a, b) => {
      if (sort === 'badges') return b.badge_count - a.badge_count
      if (sort === 'adherence') return b.adherence_7d - a.adherence_7d
      return b.current_streak - a.current_streak // default: streak
    })

    // Find current user's rank
    const myRank = client.leaderboard_opt_in
      ? entries.findIndex(e => e.client_id === client.id) + 1 || null
      : null

    return NextResponse.json({
      leaderboard: entries,
      myRank,
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

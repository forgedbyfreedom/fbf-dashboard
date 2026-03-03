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

    // Check org membership for role
    const { data: membership } = await adminSupabase
      .from('org_members')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single()

    const userRole = membership?.role ?? null
    const organizationId = membership?.organization_id ?? null

    // Get client record for this user
    const { data: client } = await adminSupabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // If no client record and not an org member, 404
    if (!client && !membership) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // If no client record (admin-only user), return minimal response
    if (!client) {
      return NextResponse.json({
        client: null,
        userRole,
        organizationId,
        metrics: null,
        recentCheckins: [],
        streak: { current_streak: 0, best_streak: 0, total_checkins: 0 },
        earnedBadges: [],
        allBadges: [],
      })
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

    // Get streak data
    const { data: streak } = await adminSupabase
      .from('client_streaks')
      .select('*')
      .eq('client_id', client.id)
      .single()

    // Get earned badges with badge definitions
    const { data: earnedBadges } = await adminSupabase
      .from('client_badges')
      .select('*, badge_definitions(*)')
      .eq('client_id', client.id)
      .order('earned_at', { ascending: false })

    // Get all badge definitions (for the gallery)
    const { data: allBadges } = await adminSupabase
      .from('badge_definitions')
      .select('*')
      .order('sort_order')

    return NextResponse.json({
      client: {
        ...client,
        last_weight: lastWeightCheckin?.weight_lbs ?? null,
      },
      userRole,
      organizationId,
      metrics: metrics ?? null,
      recentCheckins: recentCheckins ?? [],
      streak: streak ?? { current_streak: 0, best_streak: 0, total_checkins: 0 },
      earnedBadges: (earnedBadges ?? []).map(eb => ({
        ...eb.badge_definitions,
        earned_at: eb.earned_at,
      })),
      allBadges: allBadges ?? [],
    })
  } catch (err) {
    console.error('[/api/client/me] Error:', err)
    return NextResponse.json({ error: 'Server error', detail: String(err) }, { status: 500 })
  }
}

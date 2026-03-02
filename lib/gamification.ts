import { SupabaseClient } from '@supabase/supabase-js'

interface StreakData {
  current_streak: number
  best_streak: number
  total_checkins: number
  last_checkin_date: string | null
}

interface BadgeDefinition {
  id: string
  slug: string
  name: string
  description: string
  category: string
  icon: string
  threshold_json: Record<string, unknown>
}

interface ClientTargets {
  target_calories: number | null
  target_protein: number | null
  target_steps: number | null
}

/**
 * Count consecutive check-in days and upsert client_streaks.
 */
export async function updateStreaks(
  supabase: SupabaseClient,
  clientId: string
): Promise<StreakData> {
  // Get all check-in dates for this client, ordered descending
  const { data: checkins } = await supabase
    .from('checkins')
    .select('date')
    .eq('client_id', clientId)
    .order('date', { ascending: false })

  if (!checkins || checkins.length === 0) {
    return { current_streak: 0, best_streak: 0, total_checkins: 0, last_checkin_date: null }
  }

  const totalCheckins = checkins.length
  const dates = [...new Set(checkins.map(c => c.date))].sort().reverse()

  // Calculate current streak from today/yesterday backwards
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  let currentStreak = 0
  const latestDate = dates[0]

  // Streak is only active if the latest check-in is today or yesterday
  if (latestDate === today || latestDate === yesterday) {
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(latestDate)
      expected.setDate(expected.getDate() - i)
      const expectedStr = expected.toISOString().split('T')[0]

      if (dates[i] === expectedStr) {
        currentStreak++
      } else {
        break
      }
    }
  }

  // Calculate best streak by scanning all dates
  let bestStreak = currentStreak
  let tempStreak = 1
  const sortedAsc = [...dates].reverse()

  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = new Date(sortedAsc[i - 1])
    const curr = new Date(sortedAsc[i])
    const diffDays = (curr.getTime() - prev.getTime()) / 86400000

    if (diffDays === 1) {
      tempStreak++
      bestStreak = Math.max(bestStreak, tempStreak)
    } else {
      tempStreak = 1
    }
  }

  const streakData: StreakData = {
    current_streak: currentStreak,
    best_streak: bestStreak,
    total_checkins: totalCheckins,
    last_checkin_date: latestDate,
  }

  // Upsert
  await supabase.from('client_streaks').upsert(
    {
      client_id: clientId,
      ...streakData,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'client_id' }
  )

  return streakData
}

/**
 * Evaluate all unearned badges and award any newly earned ones.
 * Returns array of newly earned badge definitions.
 */
export async function evaluateBadges(
  supabase: SupabaseClient,
  clientId: string,
  streakData: StreakData,
  clientTargets: ClientTargets
): Promise<BadgeDefinition[]> {
  // Get all badge definitions
  const { data: allBadges } = await supabase
    .from('badge_definitions')
    .select('*')
    .order('sort_order')

  if (!allBadges) return []

  // Get already earned badge IDs
  const { data: earned } = await supabase
    .from('client_badges')
    .select('badge_id')
    .eq('client_id', clientId)

  const earnedIds = new Set((earned || []).map(e => e.badge_id))

  // Filter to unearned badges
  const unearned = allBadges.filter(b => !earnedIds.has(b.id))
  if (unearned.length === 0) return []

  const newlyEarned: BadgeDefinition[] = []

  for (const badge of unearned) {
    const threshold = badge.threshold_json as Record<string, unknown>
    let qualifies = false

    // Streak badges
    if (threshold.streak) {
      qualifies = streakData.current_streak >= (threshold.streak as number)
    }

    // Total check-in badges
    if (threshold.total_checkins) {
      qualifies = streakData.total_checkins >= (threshold.total_checkins as number)
    }

    // Target adherence badges (protein, calories, steps)
    if (threshold.target_type) {
      qualifies = await evaluateTargetBadge(
        supabase,
        clientId,
        threshold.target_type as string,
        threshold.days as number,
        clientTargets
      )
    }

    // Lifestyle badges (sleep, training)
    if (threshold.metric) {
      qualifies = await evaluateLifestyleBadge(
        supabase,
        clientId,
        threshold.metric as string,
        threshold.days as number,
        threshold.min_value as number | undefined
      )
    }

    if (qualifies) {
      newlyEarned.push(badge)
    }
  }

  // Insert newly earned badges
  if (newlyEarned.length > 0) {
    await supabase.from('client_badges').insert(
      newlyEarned.map(b => ({
        client_id: clientId,
        badge_id: b.id,
      }))
    )
  }

  return newlyEarned
}

async function evaluateTargetBadge(
  supabase: SupabaseClient,
  clientId: string,
  targetType: string,
  requiredDays: number,
  targets: ClientTargets
): Promise<boolean> {
  const fieldMap: Record<string, { checkinField: string; targetField: keyof ClientTargets }> = {
    protein: { checkinField: 'protein_g', targetField: 'target_protein' },
    calories: { checkinField: 'calories', targetField: 'target_calories' },
    steps: { checkinField: 'steps', targetField: 'target_steps' },
  }

  const mapping = fieldMap[targetType]
  if (!mapping) return false

  const targetValue = targets[mapping.targetField]
  if (!targetValue) return false

  // Get last N days of check-ins
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - requiredDays)

  const { data: checkins } = await supabase
    .from('checkins')
    .select('*')
    .eq('client_id', clientId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: false })
    .limit(requiredDays)

  if (!checkins || checkins.length < requiredDays) return false

  // Check consecutive days where target was met
  let consecutive = 0
  const sorted = [...checkins].sort((a: Record<string, unknown>, b: Record<string, unknown>) => (b.date as string).localeCompare(a.date as string))

  for (const c of sorted) {
    const val = Number((c as Record<string, unknown>)[mapping.checkinField])
    if (val >= targetValue) {
      consecutive++
    } else {
      break
    }
  }

  return consecutive >= requiredDays
}

async function evaluateLifestyleBadge(
  supabase: SupabaseClient,
  clientId: string,
  metric: string,
  requiredDays: number,
  minValue?: number
): Promise<boolean> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - requiredDays)

  const { data: checkins } = await supabase
    .from('checkins')
    .select('*')
    .eq('client_id', clientId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: false })
    .limit(requiredDays)

  if (!checkins || checkins.length < requiredDays) return false

  const sorted = [...checkins].sort((a: Record<string, unknown>, b: Record<string, unknown>) => (b.date as string).localeCompare(a.date as string))

  let consecutive = 0
  for (const c of sorted) {
    const val = (c as Record<string, unknown>)[metric]

    if (metric === 'training_done') {
      if (val === true) consecutive++
      else break
    } else if (minValue !== undefined) {
      if (Number(val) >= minValue) consecutive++
      else break
    }
  }

  return consecutive >= requiredDays
}

/**
 * Send push notifications for newly earned badges via internal push API.
 */
export async function sendBadgeNotifications(
  supabase: SupabaseClient,
  clientId: string,
  newBadges: BadgeDefinition[]
): Promise<void> {
  if (newBadges.length === 0) return

  // Get active push tokens for the client
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('client_id', clientId)
    .eq('is_active', true)

  if (!tokens || tokens.length === 0) return

  // Send via Expo push API directly
  const messages = newBadges.flatMap(badge =>
    tokens.map(t => ({
      to: t.token,
      title: `Badge Earned: ${badge.name}!`,
      body: badge.description,
      data: { type: 'badge_earned', badge_slug: badge.slug },
      sound: 'default' as const,
    }))
  )

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    })

    // Mark badges as notified
    const badgeIds = newBadges.map(b => b.id)
    await supabase
      .from('client_badges')
      .update({ notified: true })
      .eq('client_id', clientId)
      .in('badge_id', badgeIds)
  } catch (err) {
    console.error('Badge push notification error:', err)
  }
}

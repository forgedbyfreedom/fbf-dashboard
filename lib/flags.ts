import { SupabaseClient } from '@supabase/supabase-js'

interface FlagInput {
  client_id: string
  organization_id: string
  target_steps?: number | null
}

interface FlagResult {
  flag_type: string
  severity: 'green' | 'yellow' | 'red'
  details: Record<string, unknown>
}

export async function computeFlags(
  supabase: SupabaseClient,
  client: FlagInput
): Promise<FlagResult[]> {
  const flags: FlagResult[] = []
  const now = new Date()

  // Get recent check-ins (last 14 days)
  const fourteenDaysAgo = new Date(now)
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const { data: checkins } = await supabase
    .from('checkins')
    .select('*')
    .eq('client_id', client.client_id)
    .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })

  if (!checkins || checkins.length === 0) {
    // No check-ins at all in 14 days
    flags.push({
      flag_type: 'missed_checkin',
      severity: 'red',
      details: { message: 'No check-ins in 14 days', days_missed: 14 },
    })
    return flags
  }

  // Missed check-in: last check-in > 48h ago
  const lastCheckin = new Date(checkins[0].date + 'T12:00:00Z')
  const hoursSinceLastCheckin = (now.getTime() - lastCheckin.getTime()) / (1000 * 60 * 60)

  if (hoursSinceLastCheckin > 72) {
    flags.push({
      flag_type: 'missed_checkin',
      severity: 'red',
      details: { hours_since: Math.round(hoursSinceLastCheckin), last_date: checkins[0].date },
    })
  } else if (hoursSinceLastCheckin > 48) {
    flags.push({
      flag_type: 'missed_checkin',
      severity: 'yellow',
      details: { hours_since: Math.round(hoursSinceLastCheckin), last_date: checkins[0].date },
    })
  }

  // Sleep crash: avg sleep < 6h last 3 days
  const last3Days = checkins.slice(0, 3).filter(c => c.sleep_hours != null)
  if (last3Days.length >= 2) {
    const avgSleep = last3Days.reduce((sum, c) => sum + Number(c.sleep_hours), 0) / last3Days.length
    if (avgSleep < 6) {
      flags.push({
        flag_type: 'sleep_crash',
        severity: 'red',
        details: { avg_sleep_3d: Math.round(avgSleep * 10) / 10, days_counted: last3Days.length },
      })
    }
  }

  // Steps low: avg steps < target last 7 days
  if (client.target_steps) {
    const last7Days = checkins.slice(0, 7).filter(c => c.steps != null)
    if (last7Days.length >= 3) {
      const avgSteps = last7Days.reduce((sum, c) => sum + c.steps, 0) / last7Days.length
      if (avgSteps < client.target_steps) {
        flags.push({
          flag_type: 'steps_low',
          severity: 'yellow',
          details: { avg_steps_7d: Math.round(avgSteps), target: client.target_steps },
        })
      }
    }
  }

  // Weight stall: rolling 14-day delta < 0.5 lbs
  const withWeight = checkins.filter(c => c.weight_lbs != null)
  if (withWeight.length >= 7) {
    const recent = Number(withWeight[0].weight_lbs)
    const oldest = Number(withWeight[withWeight.length - 1].weight_lbs)
    const delta = Math.abs(recent - oldest)
    if (delta < 0.5) {
      flags.push({
        flag_type: 'weight_stall',
        severity: 'yellow',
        details: { delta_14d: Math.round(delta * 10) / 10, current: recent, oldest },
      })
    }
  }

  // Side effects reported
  const latestWithSideEffects = checkins.find(c => c.side_effects_notes && c.side_effects_notes.trim() !== '')
  if (latestWithSideEffects) {
    flags.push({
      flag_type: 'side_effects',
      severity: 'yellow',
      details: { date: latestWithSideEffects.date, notes: latestWithSideEffects.side_effects_notes },
    })
  }

  return flags
}

export async function saveFlags(supabase: SupabaseClient, clientId: string, flags: FlagResult[]) {
  // Resolve all existing open flags for this client
  await supabase
    .from('flags')
    .update({ resolved_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .is('resolved_at', null)

  // Insert new flags
  if (flags.length > 0) {
    await supabase.from('flags').insert(
      flags.map(f => ({
        client_id: clientId,
        flag_type: f.flag_type,
        severity: f.severity,
        details: f.details,
      }))
    )
  }
}

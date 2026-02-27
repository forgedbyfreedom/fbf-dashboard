import { SupabaseClient } from '@supabase/supabase-js'

export async function updateClientMetrics(supabase: SupabaseClient, clientId: string) {
  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Get 30-day check-ins
  const { data: checkins } = await supabase
    .from('checkins')
    .select('*')
    .eq('client_id', clientId)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })

  if (!checkins) return

  const last7 = checkins.filter(c => c.date >= sevenDaysAgo.toISOString().split('T')[0])

  // Adherence: how many of last 7 days had check-ins
  const adherence7d = last7.length > 0 ? (last7.length / 7) * 100 : 0

  // 7-day averages
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null
  const avgCalories7d = avg(last7.filter(c => c.calories != null).map(c => Number(c.calories)))
  const avgProtein7d = avg(last7.filter(c => c.protein_g != null).map(c => Number(c.protein_g)))
  const avgSteps7d = avg(last7.filter(c => c.steps != null).map(c => Number(c.steps)))
  const avgSleep7d = avg(last7.filter(c => c.sleep_hours != null).map(c => Number(c.sleep_hours)))

  // NEW: Mood, stress, water averages
  const avgMood7d = avg(last7.filter(c => c.mood_rating != null).map(c => Number(c.mood_rating)))
  const avgStress7d = avg(last7.filter(c => c.stress_level != null).map(c => Number(c.stress_level)))
  const avgWater7d = avg(last7.filter(c => c.water_oz != null).map(c => Number(c.water_oz)))

  // NEW: Supplement compliance (% of days compliant in last 7)
  const withCompliance = last7.filter(c => c.supplement_compliance != null)
  const supplementCompliance7d = withCompliance.length > 0
    ? (withCompliance.filter(c => c.supplement_compliance === true).length / withCompliance.length) * 100
    : null

  // Weight metrics
  const withWeight = checkins.filter(c => c.weight_lbs != null)
  const weightCurrent = withWeight.length > 0 ? Number(withWeight[0].weight_lbs) : null

  let weightDelta7d: number | null = null
  let weightDelta30d: number | null = null

  if (withWeight.length >= 2) {
    const weight7dAgo = withWeight.filter(c => c.date <= sevenDaysAgo.toISOString().split('T')[0])
    if (weight7dAgo.length > 0) {
      weightDelta7d = Number(withWeight[0].weight_lbs) - Number(weight7dAgo[0].weight_lbs)
    }

    const weight30dAgo = withWeight.filter(c => c.date <= thirtyDaysAgo.toISOString().split('T')[0])
    if (weight30dAgo.length > 0) {
      weightDelta30d = Number(withWeight[0].weight_lbs) - Number(weight30dAgo[0].weight_lbs)
    }
  }

  // Open flags count
  const { count: openFlagsCount } = await supabase
    .from('flags')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .is('resolved_at', null)

  // Status score
  let score = 100
  if (adherence7d < 50) score -= 30
  else if (adherence7d < 70) score -= 15

  const redFlags = openFlagsCount || 0
  score -= redFlags * 10

  let status: 'green' | 'yellow' | 'red' = 'green'
  if (score < 60) status = 'red'
  else if (score < 80) status = 'yellow'

  // Get coach assignment
  const { data: assignment } = await supabase
    .from('client_coach_assignments')
    .select('coach_user_id')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .single()

  // Upsert metrics
  await supabase.from('client_metrics').upsert(
    {
      client_id: clientId,
      coach_user_id: assignment?.coach_user_id || null,
      last_checkin_at: checkins.length > 0 ? checkins[0].created_at : null,
      adherence_7d: Math.round(adherence7d),
      avg_calories_7d: avgCalories7d ? Math.round(avgCalories7d) : null,
      avg_protein_7d: avgProtein7d ? Math.round(avgProtein7d) : null,
      avg_steps_7d: avgSteps7d ? Math.round(avgSteps7d) : null,
      avg_sleep_7d: avgSleep7d ? Math.round(avgSleep7d * 10) / 10 : null,
      avg_mood_7d: avgMood7d ? Math.round(avgMood7d * 10) / 10 : null,
      avg_stress_7d: avgStress7d ? Math.round(avgStress7d * 10) / 10 : null,
      avg_water_7d: avgWater7d ? Math.round(avgWater7d) : null,
      supplement_compliance_7d: supplementCompliance7d ? Math.round(supplementCompliance7d * 100) / 100 : null,
      weight_current: weightCurrent,
      weight_delta_7d: weightDelta7d ? Math.round(weightDelta7d * 10) / 10 : null,
      weight_delta_30d: weightDelta30d ? Math.round(weightDelta30d * 10) / 10 : null,
      status,
      open_flags_count: openFlagsCount || 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'client_id' }
  )
}

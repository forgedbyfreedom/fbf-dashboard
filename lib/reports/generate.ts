import { createAdminClient } from '@/lib/supabase/admin'
import { chatCompletion } from '@/lib/openrouter'

interface ReportMetrics {
  adherence: number
  avgCalories: number | null
  avgProtein: number | null
  avgSteps: number | null
  avgSleep: number | null
  avgWater: number | null
  avgMood: number | null
  avgStress: number | null
  supplementCompliance: number | null
  avgPerformance: number | null
  supplementCompliancePct: number | null
  caloriesVsTarget: { date: string; actual: number; target: number }[]
  targetCalories: number | null
  targetProtein: number | null
  targetSteps: number | null
  targetWaterOz: number | null
  weightStart: number | null
  weightEnd: number | null
  weightChange: number | null
  trainingDays: number
  totalDays: number
  bodyFatLatest: number | null
  leanMassLatest: number | null
}

export interface ReportData {
  clientName: string
  clientEmail: string | null
  coachName: string
  reportType: 'weekly' | 'monthly'
  dateRange: string
  startDate: string
  endDate: string
  metrics: ReportMetrics
  coachMessage: string
  programName: string | null
  coachNotes: { date: string; note: string; action_items: string[] }[]
  clientNotes: { date: string; note: string }[]
}

export async function generateReportData(
  clientId: string,
  reportType: 'weekly' | 'monthly'
): Promise<ReportData> {
  const adminSupabase = createAdminClient()

  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  if (reportType === 'weekly') {
    startDate.setDate(startDate.getDate() - 7)
  } else {
    startDate.setMonth(startDate.getMonth() - 1)
  }

  const startStr = startDate.toISOString().split('T')[0]
  const endStr = endDate.toISOString().split('T')[0]

  // Fetch client
  const { data: client } = await adminSupabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (!client) throw new Error('Client not found')

  // Fetch coach
  const { data: assignment } = await adminSupabase
    .from('client_coach_assignments')
    .select('coach_user_id')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .single()

  let coachName = 'Your Coach'
  if (assignment) {
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('full_name')
      .eq('id', assignment.coach_user_id)
      .single()
    if (profile?.full_name) coachName = profile.full_name
  }

  // Fetch checkins in range
  const { data: checkins } = await adminSupabase
    .from('checkins')
    .select('*')
    .eq('client_id', clientId)
    .gte('date', startStr)
    .lte('date', endStr)
    .order('date', { ascending: true })

  const checkinsArr = checkins || []
  const totalDays = reportType === 'weekly' ? 7 : 30

  // Compute metrics
  const withCalories = checkinsArr.filter(c => c.calories != null)
  const withProtein = checkinsArr.filter(c => c.protein_g != null)
  const withSteps = checkinsArr.filter(c => c.steps != null)
  const withSleep = checkinsArr.filter(c => c.sleep_hours != null)
  const withWater = checkinsArr.filter(c => c.water_oz != null)
  const withMood = checkinsArr.filter(c => c.mood_rating != null)
  const withStress = checkinsArr.filter(c => c.stress_level != null)
  const withWeight = checkinsArr.filter(c => c.weight_lbs != null)
  const withPerformance = checkinsArr.filter(c => c.performance_rating != null)
  const compliant = checkinsArr.filter(c => c.supplement_compliance === true)
  const withSupplementData = checkinsArr.filter(c => c.supplement_compliance != null)
  const trainingDays = checkinsArr.filter(c => c.training_done).length

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null

  const weightStart = withWeight.length > 0 ? withWeight[0].weight_lbs : null
  const weightEnd = withWeight.length > 0 ? withWeight[withWeight.length - 1].weight_lbs : null

  // Latest body comp scan
  const { data: latestScan } = await adminSupabase
    .from('body_composition_scans')
    .select('body_fat_pct, lean_mass_lbs')
    .eq('client_id', clientId)
    .order('scan_date', { ascending: false })
    .limit(1)
    .single()

  // Calories vs target daily data
  const caloriesVsTarget = client.target_calories
    ? withCalories.map(c => ({
        date: c.date,
        actual: c.calories,
        target: client.target_calories as number,
      }))
    : []

  const metrics: ReportMetrics = {
    adherence: totalDays > 0 ? Math.round((checkinsArr.length / totalDays) * 100) : 0,
    avgCalories: avg(withCalories.map(c => c.calories)),
    avgProtein: avg(withProtein.map(c => c.protein_g)),
    avgSteps: avg(withSteps.map(c => c.steps)),
    avgSleep: avg(withSleep.map(c => c.sleep_hours)),
    avgWater: avg(withWater.map(c => c.water_oz)),
    avgMood: avg(withMood.map(c => c.mood_rating)),
    avgStress: avg(withStress.map(c => c.stress_level)),
    supplementCompliance: checkinsArr.length > 0 ? Math.round((compliant.length / checkinsArr.length) * 100) : null,
    avgPerformance: avg(withPerformance.map(c => c.performance_rating)),
    supplementCompliancePct: withSupplementData.length > 0 ? Math.round((compliant.length / withSupplementData.length) * 100) : null,
    caloriesVsTarget,
    targetCalories: client.target_calories,
    targetProtein: client.target_protein,
    targetSteps: client.target_steps,
    targetWaterOz: client.target_water_oz,
    weightStart,
    weightEnd,
    weightChange: weightStart && weightEnd ? +(weightEnd - weightStart).toFixed(1) : null,
    trainingDays,
    totalDays: checkinsArr.length,
    bodyFatLatest: latestScan?.body_fat_pct || null,
    leanMassLatest: latestScan?.lean_mass_lbs || null,
  }

  // Fetch coach notes for this client in date range (limit 5 most recent)
  const { data: coachNotesRaw } = await adminSupabase
    .from('coach_notes')
    .select('note, action_items, created_at')
    .eq('client_id', clientId)
    .gte('created_at', startStr)
    .lte('created_at', endStr + 'T23:59:59')
    .order('created_at', { ascending: false })
    .limit(5)

  const coachNotes = (coachNotesRaw || []).map(n => ({
    date: new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    note: n.note,
    action_items: Array.isArray(n.action_items) ? n.action_items as string[] : [],
  }))

  // Extract client notes from checkins (non-empty general_notes, limit 5)
  const clientNotes = checkinsArr
    .filter(c => c.general_notes && c.general_notes.trim())
    .slice(-5)
    .map(c => ({
      date: new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      note: c.general_notes,
    }))

  // Generate coach motivational message via AI
  const coachMessage = await generateCoachMessage(
    client.first_name,
    coachName,
    reportType,
    metrics
  )

  const dateRange = `${new Date(startStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(endStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return {
    clientName: `${client.first_name} ${client.last_name}`,
    clientEmail: client.email,
    coachName,
    reportType,
    dateRange,
    startDate: startStr,
    endDate: endStr,
    metrics,
    coachMessage,
    programName: client.program_name || null,
    coachNotes,
    clientNotes,
  }
}

async function generateCoachMessage(
  clientFirstName: string,
  coachName: string,
  reportType: string,
  metrics: ReportMetrics
): Promise<string> {
  const systemPrompt = `You are Coach ${coachName} from Forged by Freedom. Write a short, motivational message (3-5 sentences) for your client's ${reportType} progress report. Be encouraging but honest. Reference specific metrics when notable. Sign off as "Coach ${coachName}".`

  const userPrompt = `Write a motivational message for ${clientFirstName}'s ${reportType} report:
- Check-in adherence: ${metrics.adherence}%
- Avg calories: ${metrics.avgCalories?.toFixed(0) || 'N/A'} (target: ${metrics.targetCalories || 'N/A'})
- Avg protein: ${metrics.avgProtein?.toFixed(0) || 'N/A'}g (target: ${metrics.targetProtein || 'N/A'}g)
- Training days: ${metrics.trainingDays}/${metrics.totalDays}
- Weight change: ${metrics.weightChange != null ? `${metrics.weightChange > 0 ? '+' : ''}${metrics.weightChange} lbs` : 'N/A'}
- Avg mood: ${metrics.avgMood?.toFixed(1) || 'N/A'}/10
- Supplement compliance: ${metrics.supplementCompliance ?? 'N/A'}%`

  try {
    return await chatCompletion(systemPrompt, userPrompt, {
      temperature: 0.8,
      max_tokens: 512,
    })
  } catch {
    return `${clientFirstName}, keep pushing forward. Every day of effort counts. Stay consistent and trust the process. — Coach ${coachName}`
  }
}

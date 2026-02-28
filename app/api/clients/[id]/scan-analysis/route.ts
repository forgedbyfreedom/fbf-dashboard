import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { chatCompletion } from '@/lib/openrouter'

const ANALYSIS_SYSTEM_PROMPT = `You are an expert bodybuilding and body composition coach analyzing data for a Forged by Freedom client. Provide a thorough, professional analysis.

Structure your analysis with these sections:

## Current Assessment
Analyze the latest scan results in context of the client's goals and program.

## Historical Comparison
If multiple scans are available, create a comparison table and analyze trends:
| Date | Type | Body Fat % | Lean Mass (lbs) | Change |
Include rate of change calculations (per week/month).

## Trend Analysis
- Direction of body fat (losing/gaining/stalled)
- Lean mass trajectory (gaining/losing/maintaining)
- Rate of change and whether it's sustainable/healthy

## Key Observations
Specific insights about the client's progress, noting any concerning patterns or positive trends.

## Recommendations
Actionable recommendations for the coach to consider adjusting in the program.

---
*For personalized AI-powered guidance, visit [Forged by Freedom AI Coach](https://forgedbyfreedom.org/ai-coach)*`

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { scan_id } = body

    if (!scan_id) {
      return NextResponse.json({ error: 'scan_id is required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Fetch all scans for this client
    const { data: scans } = await adminSupabase
      .from('body_composition_scans')
      .select('*')
      .eq('client_id', clientId)
      .order('scan_date', { ascending: true })

    if (!scans || scans.length === 0) {
      return NextResponse.json({ error: 'No scans found' }, { status: 404 })
    }

    // Fetch client + program context
    const { data: client } = await adminSupabase
      .from('clients')
      .select('first_name, last_name, program_name, target_calories, target_protein, workout_program, cardio_protocol')
      .eq('id', clientId)
      .single()

    // Fetch recent checkins for context
    const { data: recentCheckins } = await adminSupabase
      .from('checkins')
      .select('date, weight_lbs, calories, protein_g, steps, training_done')
      .eq('client_id', clientId)
      .order('date', { ascending: false })
      .limit(14)

    // Build context
    const currentScan = scans.find(s => s.id === scan_id) || scans[scans.length - 1]
    const scanHistory = scans.map(s => ({
      date: s.scan_date,
      type: s.scan_type,
      body_fat_pct: s.body_fat_pct,
      lean_mass_lbs: s.lean_mass_lbs,
      notes: s.notes,
    }))

    const programContext = client ? {
      name: `${client.first_name} ${client.last_name}`,
      program: client.program_name,
      target_calories: client.target_calories,
      target_protein: client.target_protein,
      training_days: client.workout_program?.length || 0,
      has_cardio: client.cardio_protocol?.length > 0,
    } : null

    const checkinSummary = recentCheckins?.length ? {
      avg_weight: recentCheckins.filter(c => c.weight_lbs).reduce((sum, c) => sum + (c.weight_lbs || 0), 0) / recentCheckins.filter(c => c.weight_lbs).length || null,
      avg_calories: recentCheckins.filter(c => c.calories).reduce((sum, c) => sum + (c.calories || 0), 0) / recentCheckins.filter(c => c.calories).length || null,
      training_frequency: `${recentCheckins.filter(c => c.training_done).length}/${recentCheckins.length} days`,
    } : null

    const userPrompt = `Analyze the body composition for this client:

**Client:** ${programContext?.name || 'Unknown'}
**Program:** ${programContext?.program || 'Not specified'}
**Targets:** ${programContext?.target_calories || '?'} cal / ${programContext?.target_protein || '?'}g protein

**Current Scan (${currentScan.scan_date}):**
- Type: ${currentScan.scan_type}
- Body Fat: ${currentScan.body_fat_pct != null ? `${currentScan.body_fat_pct}%` : 'N/A'}
- Lean Mass: ${currentScan.lean_mass_lbs != null ? `${currentScan.lean_mass_lbs} lbs` : 'N/A'}

**All Scan History:**
${JSON.stringify(scanHistory, null, 2)}

${checkinSummary ? `**Recent Check-in Averages (14 days):**
- Avg Weight: ${checkinSummary.avg_weight?.toFixed(1) || 'N/A'} lbs
- Avg Calories: ${checkinSummary.avg_calories?.toFixed(0) || 'N/A'}
- Training: ${checkinSummary.training_frequency}` : ''}

Provide a comprehensive analysis.`

    const analysisText = await chatCompletion(
      ANALYSIS_SYSTEM_PROMPT,
      userPrompt,
      { temperature: 0.6, max_tokens: 2048 }
    )

    // Save analysis to the scan record
    const { error: updateError } = await adminSupabase
      .from('body_composition_scans')
      .update({
        analysis_text: analysisText,
        analysis_generated_at: new Date().toISOString(),
      })
      .eq('id', scan_id)

    if (updateError) {
      console.error('Failed to save analysis:', updateError)
    }

    return NextResponse.json({
      analysis: analysisText,
      scan_id,
      generated_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Scan analysis error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

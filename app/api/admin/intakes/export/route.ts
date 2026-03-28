import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-check'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/intakes/export
 *
 * Returns all completed intakes organized by client, with waiver status.
 * Can filter by: ?status=completed|pending|all
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'

    // Check both intake tables
    const results: Array<Record<string, unknown>> = []

    // Dashboard intakes (client_intake)
    const dashQuery = supabase
      .from('client_intake')
      .select('*, clients(first_name, last_name, email)')
      .order('completed_at', { ascending: false })

    if (status === 'completed') {
      dashQuery.not('completed_at', 'is', null)
    } else if (status === 'pending') {
      dashQuery.is('completed_at', null)
    }

    const { data: dashIntakes } = await dashQuery
    for (const intake of dashIntakes || []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = (intake as Record<string, unknown>).clients as Record<string, string> | null
      results.push({
        source: 'dashboard',
        id: intake.id,
        client_name: client ? `${client.first_name} ${client.last_name}` : 'Unknown',
        email: client?.email || intake.email || null,
        phone: intake.phone,
        completed_at: intake.completed_at,
        waiver_accepted: intake.waiver_accepted,
        waiver_accepted_at: intake.waiver_accepted_at,
        waiver_ip: intake.waiver_ip,
        program_status: intake.program_status,
        primary_goals: intake.primary_goals,
        current_weight_lbs: intake.current_weight_lbs,
        goal_weight_lbs: intake.goal_weight_lbs,
        training_experience: intake.training_experience,
        medical_conditions: intake.medical_conditions,
        injuries_or_limitations: intake.injuries_or_limitations,
        allergies: intake.allergies,
      })
    }

    // Render intakes (client_intakes)
    const renderQuery = supabase
      .from('client_intakes')
      .select('*')
      .order('created_at', { ascending: false })

    if (status === 'completed') {
      renderQuery.not('waiver_signature', 'is', null)
    } else if (status === 'pending') {
      renderQuery.is('waiver_signature', null)
    }

    const { data: renderIntakes } = await renderQuery
    for (const intake of renderIntakes || []) {
      results.push({
        source: 'render',
        id: intake.id,
        client_name: intake.full_name || 'Unknown',
        email: intake.email || null,
        phone: intake.phone,
        completed_at: intake.completed_at || intake.created_at,
        waiver_accepted: !!intake.waiver_signature,
        waiver_signature: intake.waiver_signature,
        waiver_accepted_at: intake.waiver_signed_at,
        waiver_ip: intake.waiver_ip,
        program_status: intake.program_status,
        primary_goals: intake.primary_goals,
        current_weight_lbs: intake.current_weight_lbs,
        goal_weight_lbs: intake.goal_weight_lbs,
        height_inches: intake.height_inches,
        training_experience: intake.training_experience,
        medical_conditions: intake.medical_conditions,
        injuries: intake.injuries,
        allergies: intake.allergies,
        gender: intake.gender,
        date_of_birth: intake.date_of_birth,
      })
    }

    return NextResponse.json({
      intakes: results,
      count: results.length,
      completed: results.filter(r => r.waiver_accepted).length,
      pending: results.filter(r => !r.waiver_accepted).length,
    })
  } catch (err) {
    console.error('Export intakes error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

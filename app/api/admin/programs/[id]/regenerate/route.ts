import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-check'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateProgram, IntakeData, ClientInfo } from '@/lib/program-generator'

/**
 * POST /api/admin/programs/[id]/regenerate
 *
 * Regenerates the AI program for a review that was rejected or errored.
 * Resets the review to 'generating' and re-runs the AI pipeline.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    const { data: membership } = await adminSupabase
      .from('org_members')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'org_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Get the review
    const { data: review } = await adminSupabase
      .from('program_reviews')
      .select('*')
      .eq('id', id)
      .single()

    if (!review) {
      return NextResponse.json({ error: 'Program review not found' }, { status: 404 })
    }

    // Get client + intake
    const { data: client } = await adminSupabase
      .from('clients')
      .select('id, first_name, last_name, email')
      .eq('id', review.client_id)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { data: intake } = await adminSupabase
      .from('client_intake')
      .select('*')
      .eq('client_id', review.client_id)
      .single()

    if (!intake) {
      return NextResponse.json({ error: 'Intake data not found' }, { status: 404 })
    }

    // Mark as generating
    await adminSupabase
      .from('program_reviews')
      .update({ status: 'generating', error_message: null })
      .eq('id', id)

    await adminSupabase
      .from('client_intake')
      .update({ program_status: 'generating' })
      .eq('client_id', review.client_id)

    try {
      const intakeData: IntakeData = {
        client_id: client.id,
        phone: intake.phone,
        date_of_birth: intake.date_of_birth,
        height_inches: intake.height_inches,
        current_weight_lbs: intake.current_weight_lbs,
        goal_weight_lbs: intake.goal_weight_lbs,
        primary_goals: intake.primary_goals,
        training_experience: intake.training_experience,
        injuries_or_limitations: intake.injuries_or_limitations,
        medical_conditions: intake.medical_conditions,
        current_medications: intake.current_medications,
        allergies: intake.allergies,
        dietary_restrictions: intake.dietary_restrictions,
        previous_coaches: intake.previous_coaches,
        how_did_you_hear: intake.how_did_you_hear,
      }

      const clientInfo: ClientInfo = {
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
      }

      const program = await generateProgram(intakeData, clientInfo)

      await adminSupabase
        .from('program_reviews')
        .update({
          generated_program: program,
          status: 'pending_review',
          generated_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', id)

      await adminSupabase
        .from('client_intake')
        .update({ program_status: 'ready_for_review' })
        .eq('client_id', review.client_id)

      return NextResponse.json({ success: true, status: 'pending_review' })
    } catch (genError) {
      await adminSupabase
        .from('program_reviews')
        .update({
          status: 'error',
          error_message: genError instanceof Error ? genError.message : 'Unknown error',
        })
        .eq('id', id)

      await adminSupabase
        .from('client_intake')
        .update({ program_status: 'pending' })
        .eq('client_id', review.client_id)

      return NextResponse.json({
        error: 'Regeneration failed',
        details: genError instanceof Error ? genError.message : 'Unknown error',
      }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

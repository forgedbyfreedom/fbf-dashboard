import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, ...intakeData } = body

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    // Hash the token
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const supabase = createAdminClient()

    // Validate the token
    const { data: link, error: linkError } = await supabase
      .from('intake_tokens')
      .select('client_id')
      .eq('token_hash', tokenHash)
      .eq('status', 'active')
      .single()

    if (linkError || !link) {
      return NextResponse.json({ error: 'Invalid or expired intake link' }, { status: 404 })
    }

    const clientId = link.client_id

    // Get client IP for waiver
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'

    // Build the intake record
    const intakeRecord: Record<string, unknown> = {
      client_id: clientId,
      phone: intakeData.phone || null,
      date_of_birth: intakeData.date_of_birth || null,
      emergency_contact_name: intakeData.emergency_contact_name || null,
      emergency_contact_phone: intakeData.emergency_contact_phone || null,
      height_inches: intakeData.height_inches ? parseInt(intakeData.height_inches) : null,
      current_weight_lbs: intakeData.current_weight_lbs ? parseFloat(intakeData.current_weight_lbs) : null,
      goal_weight_lbs: intakeData.goal_weight_lbs ? parseFloat(intakeData.goal_weight_lbs) : null,
      primary_goals: intakeData.primary_goals || null,
      training_experience: intakeData.training_experience || null,
      injuries_or_limitations: intakeData.injuries_or_limitations || null,
      medical_conditions: intakeData.medical_conditions || null,
      current_medications: intakeData.current_medications || null,
      allergies: intakeData.allergies || null,
      dietary_restrictions: intakeData.dietary_restrictions || null,
      previous_coaches: intakeData.previous_coaches || null,
      how_did_you_hear: intakeData.how_did_you_hear || null,
    }

    // Handle waiver
    if (intakeData.waiver_accepted) {
      intakeRecord.waiver_accepted = true
      intakeRecord.waiver_accepted_at = new Date().toISOString()
      intakeRecord.waiver_ip = ip
    }

    // Mark as completed if waiver is accepted
    if (intakeData.waiver_accepted) {
      intakeRecord.completed_at = new Date().toISOString()
    }

    // Upsert the intake record (one per client)
    const { error: upsertError } = await supabase
      .from('client_intake')
      .upsert(intakeRecord, { onConflict: 'client_id' })

    if (upsertError) {
      console.error('Intake upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to save intake form' }, { status: 500 })
    }

    // Also update the client's phone if provided
    if (intakeData.phone) {
      await supabase
        .from('clients')
        .update({ phone: intakeData.phone })
        .eq('id', clientId)
    }

    // Mark token as used if intake is complete
    if (intakeData.waiver_accepted) {
      await supabase
        .from('intake_tokens')
        .update({ status: 'used', used_at: new Date().toISOString() })
        .eq('token_hash', tokenHash)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Intake error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// GET endpoint for admin to check intake status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')

    if (!clientId) {
      return NextResponse.json({ error: 'client_id required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: intake, error } = await supabase
      .from('client_intake')
      .select('*')
      .eq('client_id', clientId)
      .single()

    if (error || !intake) {
      return NextResponse.json({ intake: null })
    }

    return NextResponse.json({ intake })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

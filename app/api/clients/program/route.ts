import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { client_id, ...fields } = body

    if (!client_id) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
    }

    // Build update payload from only provided fields
    const allowedFields = [
      'program_name', 'program_raw_text',
      'target_calories', 'target_protein', 'target_carbs', 'target_fats',
      'target_steps', 'target_water_oz', 'weigh_in_day',
      'workout_program', 'cardio_protocol', 'meal_plan',
      'current_supplements', 'current_peds', 'current_peptides',
      'medical_protocol',
    ]

    const updatePayload: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in fields) {
        updatePayload[key] = fields[key]
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase
      .from('clients')
      .update(updatePayload)
      .eq('id', client_id)

    if (error) {
      return NextResponse.json({ error: `Update failed: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

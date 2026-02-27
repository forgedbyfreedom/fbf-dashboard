import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      client_id,
      program_name,
      program_raw_text,
      target_calories,
      target_protein,
      target_carbs,
      target_fats,
      target_water_oz,
      workout_program,
      cardio_protocol,
      meal_plan,
      current_supplements,
      medical_protocol,
    } = body

    if (!client_id) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    const { error } = await adminSupabase
      .from('clients')
      .update({
        program_name: program_name || null,
        program_raw_text: program_raw_text || null,
        target_calories: target_calories || null,
        target_protein: target_protein || null,
        target_carbs: target_carbs || null,
        target_fats: target_fats || null,
        target_water_oz: target_water_oz || null,
        workout_program: workout_program || [],
        cardio_protocol: cardio_protocol || [],
        meal_plan: meal_plan || [],
        current_supplements: current_supplements || [],
        medical_protocol: medical_protocol || [],
      })
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

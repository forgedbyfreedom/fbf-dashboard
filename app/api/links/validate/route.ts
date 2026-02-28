import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
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

    // Look up the link
    const { data: link, error } = await supabase
      .from('client_links')
      .select('*, clients(*)')
      .eq('token_hash', tokenHash)
      .eq('status', 'active')
      .single()

    if (error || !link) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    // Update last_used_at
    await supabase
      .from('client_links')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', link.id)

    // Get latest weight from metrics
    const { data: metrics } = await supabase
      .from('client_metrics')
      .select('weight_current')
      .eq('client_id', link.clients.id)
      .single()

    return NextResponse.json({
      client: {
        id: link.clients.id,
        first_name: link.clients.first_name,
        last_name: link.clients.last_name,
        target_calories: link.clients.target_calories,
        target_protein: link.clients.target_protein,
        target_steps: link.clients.target_steps,
        weigh_in_day: link.clients.weigh_in_day || 'monday',
        current_supplements: link.clients.current_supplements || [],
        current_peds: link.clients.current_peds || [],
        current_peptides: link.clients.current_peptides || [],
        workout_program: link.clients.workout_program || [],
        cardio_protocol: link.clients.cardio_protocol || [],
        medical_protocol: link.clients.medical_protocol || [],
        target_carbs: link.clients.target_carbs,
        target_fats: link.clients.target_fats,
        last_weight: metrics?.weight_current || null,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminSupabase = createAdminClient()

    const { data: client, error } = await adminSupabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get coach assignment
    const { data: assignment } = await adminSupabase
      .from('client_coach_assignments')
      .select('coach_user_id')
      .eq('client_id', id)
      .eq('is_active', true)
      .single()

    let coachName = null
    if (assignment) {
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('full_name')
        .eq('id', assignment.coach_user_id)
        .single()
      coachName = profile?.full_name || null
    }

    return NextResponse.json({ client, coach_name: coachName })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const adminSupabase = createAdminClient()

    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'timezone',
      'is_active', 'sms_opt_in', 'weigh_in_day',
      'target_calories', 'target_protein', 'target_carbs', 'target_fats',
      'target_steps', 'target_water_oz',
      'current_supplements', 'current_peds', 'current_peptides',
      'program_name',
    ]
    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await adminSupabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Client update error:', error)
      return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
    }

    return NextResponse.json({ client: data })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminSupabase = createAdminClient()

    // Soft delete — deactivate instead of hard delete
    const { error } = await adminSupabase
      .from('clients')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to deactivate client' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

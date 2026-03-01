import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    const updates: Record<string, unknown> = {}

    if ('completed_at' in body) {
      updates.completed_at = body.completed_at === 'now' ? new Date().toISOString() : body.completed_at
    }
    if ('notes' in body) {
      updates.notes = body.notes
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await adminSupabase
      .from('scheduled_checkins')
      .update(updates)
      .eq('id', id)
      .eq('coach_user_id', user.id)
      .select('*, clients(id, first_name, last_name)')
      .single()

    if (error) {
      console.error('Scheduled checkin update error:', error)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ checkin: data })
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

    const { error } = await adminSupabase
      .from('scheduled_checkins')
      .delete()
      .eq('id', id)
      .eq('coach_user_id', user.id)

    if (error) {
      console.error('Scheduled checkin delete error:', error)
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

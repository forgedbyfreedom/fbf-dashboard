import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-check'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/programs/[id]
 *
 * Get a single program review with full generated_program data + intake data.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // Verify org_admin
    const { data: membership } = await adminSupabase
      .from('org_members')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'org_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Get program review
    const { data: review, error } = await adminSupabase
      .from('program_reviews')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !review) {
      return NextResponse.json({ error: 'Program review not found' }, { status: 404 })
    }

    // Get client info
    const { data: client } = await adminSupabase
      .from('clients')
      .select('id, first_name, last_name, email, phone, user_id')
      .eq('id', review.client_id)
      .single()

    // Get intake data
    const { data: intake } = await adminSupabase
      .from('client_intake')
      .select('*')
      .eq('client_id', review.client_id)
      .single()

    return NextResponse.json({ review, client, intake })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/programs/[id]
 *
 * Update the program review (save edits before approval).
 * Body: { generated_program: {...}, admin_notes?: string }
 */
export async function PATCH(
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
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if (body.generated_program !== undefined) updates.generated_program = body.generated_program
    if (body.admin_notes !== undefined) updates.admin_notes = body.admin_notes
    updates.reviewed_at = new Date().toISOString()

    const { data: review, error } = await adminSupabase
      .from('program_reviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ review })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-check'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/programs
 *
 * List all program reviews, optionally filtered by status.
 * Query params: ?status=pending_review (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // Verify org_admin
    const { data: membership } = await adminSupabase
      .from('org_members')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'org_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = adminSupabase
      .from('program_reviews')
      .select(`
        id, client_id, intake_id, status, admin_notes, error_message,
        generated_at, reviewed_at, approved_at, created_at,
        clients(id, first_name, last_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: reviews, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reviews: reviews ?? [] })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

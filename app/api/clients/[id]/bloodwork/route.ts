import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserFromRequest, authorizeClientAccess } from '@/lib/auth-check'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await authorizeClientAccess(user.id, clientId)
    if (!access.authorized) {
      return NextResponse.json({ error: access.reason }, { status: 403 })
    }

    const adminSupabase = createAdminClient()
    const { data: results, error } = await adminSupabase
      .from('bloodwork_results')
      .select('*')
      .eq('client_id', clientId)
      .order('test_date', { ascending: false })

    if (error) {
      console.error('Bloodwork fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch bloodwork results' }, { status: 500 })
    }

    return NextResponse.json({ results: results || [] })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await authorizeClientAccess(user.id, clientId)
    if (!access.authorized) {
      return NextResponse.json({ error: access.reason }, { status: 403 })
    }

    const body = await request.json()
    const { test_date, markers, file_url, notes } = body

    if (!test_date || !markers || !Array.isArray(markers)) {
      return NextResponse.json({ error: 'test_date and markers array are required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
    const { data: result, error } = await adminSupabase
      .from('bloodwork_results')
      .insert({
        client_id: clientId,
        test_date,
        markers,
        file_url: file_url || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Bloodwork insert error:', error)
      return NextResponse.json({ error: 'Failed to save bloodwork' }, { status: 500 })
    }

    return NextResponse.json({ result })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

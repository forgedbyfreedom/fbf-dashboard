import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'

async function getUserFromRequest(request: NextRequest) {
  // Try Bearer token first (mobile app)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (user && !error) return user
  }

  // Fall back to cookie-based auth (web dashboard)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

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

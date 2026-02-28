import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()
    const { data: scans, error } = await adminSupabase
      .from('body_composition_scans')
      .select('*')
      .eq('client_id', clientId)
      .order('scan_date', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 })
    }

    return NextResponse.json({ scans: scans || [] })
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { scan_date, scan_type, body_fat_pct, lean_mass_lbs, notes } = body

    if (!scan_date || !scan_type) {
      return NextResponse.json({ error: 'scan_date and scan_type are required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
    const { data: scan, error } = await adminSupabase
      .from('body_composition_scans')
      .insert({
        client_id: clientId,
        scan_date,
        scan_type,
        body_fat_pct: body_fat_pct ? parseFloat(body_fat_pct) : null,
        lean_mass_lbs: lean_mass_lbs ? parseFloat(lean_mass_lbs) : null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Scan insert error:', error)
      return NextResponse.json({ error: 'Failed to save scan' }, { status: 500 })
    }

    return NextResponse.json({ scan })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

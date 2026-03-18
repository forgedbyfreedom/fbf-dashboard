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
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await authorizeClientAccess(user.id, clientId)
    if (!access.authorized) {
      return NextResponse.json({ error: access.reason }, { status: 403 })
    }

    const body = await request.json()
    const {
      scan_date, scan_type, body_fat_pct, lean_mass_lbs, fat_mass_lbs,
      total_weight_lbs, skeletal_muscle_mass_lbs, basal_metabolic_rate,
      visceral_fat_level, notes, file_url
    } = body

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
        body_fat_pct: body_fat_pct != null ? parseFloat(body_fat_pct) : null,
        lean_mass_lbs: lean_mass_lbs != null ? parseFloat(lean_mass_lbs) : null,
        fat_mass_lbs: fat_mass_lbs != null ? parseFloat(fat_mass_lbs) : null,
        total_weight_lbs: total_weight_lbs != null ? parseFloat(total_weight_lbs) : null,
        skeletal_muscle_mass_lbs: skeletal_muscle_mass_lbs != null ? parseFloat(skeletal_muscle_mass_lbs) : null,
        basal_metabolic_rate: basal_metabolic_rate != null ? parseInt(basal_metabolic_rate) : null,
        visceral_fat_level: visceral_fat_level != null ? parseFloat(visceral_fat_level) : null,
        notes: notes || null,
        file_url: file_url || null,
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

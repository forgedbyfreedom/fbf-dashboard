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
      visceral_fat_level, body_water_lbs, bmi, percent_body_water, inbody_score,
      right_arm_lbs, left_arm_lbs, trunk_lbs, right_leg_lbs, left_leg_lbs,
      notes, file_url
    } = body

    const num = (v: unknown) => {
      if (v === null || v === undefined || v === '') return null
      const n = typeof v === 'number' ? v : parseFloat(String(v))
      return Number.isFinite(n) ? n : null
    }
    const int = (v: unknown) => {
      const n = num(v)
      return n === null ? null : Math.round(n)
    }

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
        body_fat_pct: num(body_fat_pct),
        lean_mass_lbs: num(lean_mass_lbs),
        fat_mass_lbs: num(fat_mass_lbs),
        total_weight_lbs: num(total_weight_lbs),
        skeletal_muscle_mass_lbs: num(skeletal_muscle_mass_lbs),
        basal_metabolic_rate: int(basal_metabolic_rate),
        visceral_fat_level: num(visceral_fat_level),
        body_water_lbs: num(body_water_lbs),
        bmi: num(bmi),
        percent_body_water: num(percent_body_water),
        inbody_score: int(inbody_score),
        right_arm_lbs: num(right_arm_lbs),
        left_arm_lbs: num(left_arm_lbs),
        trunk_lbs: num(trunk_lbs),
        right_leg_lbs: num(right_leg_lbs),
        left_leg_lbs: num(left_leg_lbs),
        notes: notes || null,
        file_url: file_url || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[SCANS] insert error:', error)
      return NextResponse.json(
        { error: `Failed to save scan: ${error.message}`, code: error.code, details: error.details },
        { status: 500 },
      )
    }

    return NextResponse.json({ scan })
  } catch (err) {
    console.error('[SCANS] POST fatal:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    )
  }
}

export async function DELETE(
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

    const { scan_id } = await request.json()
    if (!scan_id) {
      return NextResponse.json({ error: 'scan_id required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
      .from('body_composition_scans')
      .delete()
      .eq('id', scan_id)
      .eq('client_id', clientId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete scan' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

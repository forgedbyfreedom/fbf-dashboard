import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

const BRYAN_USER_ID = 'c2ad095d-28c6-492d-9fae-7d9c02d3022b'
const ADMIN_EMAILS = ['forgedbyfreedom@proton.me', 'wantonelli2@comcast.net']

// Program-related fields that trigger change notifications
const PROGRAM_FIELDS = [
  'target_calories', 'target_protein', 'target_steps', 'target_carbs',
  'target_fats', 'target_water_oz', 'weigh_in_day', 'workout_program',
  'cardio_protocol', 'meal_plan', 'medical_protocol', 'current_supplements',
  'current_peds', 'current_peptides', 'program_name', 'program_raw_text',
]

async function getUserFromRequest(request: NextRequest) {
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
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function verifyAdmin(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return { error: 'Unauthorized', status: 401 }

  const adminSupabase = createAdminClient()
  const { data: membership } = await adminSupabase
    .from('org_members')
    .select('role, organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'org_admin') {
    return { error: 'Forbidden', status: 403 }
  }

  return { user, membership, adminSupabase }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { membership, adminSupabase } = auth
    const { id } = await params

    const { data: client, error } = await adminSupabase
      .from('clients')
      .select(`
        *,
        client_coach_assignments(coach_user_id, is_active, profiles:coach_user_id(full_name, email))
      `)
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .single()

    if (error || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get all check-ins
    const { data: checkins } = await adminSupabase
      .from('checkins')
      .select('*')
      .eq('client_id', id)
      .order('date', { ascending: false })
      .limit(50)

    // Get metrics
    const { data: metrics } = await adminSupabase
      .from('client_metrics')
      .select('*')
      .eq('client_id', id)
      .single()

    return NextResponse.json({
      client,
      checkins: checkins ?? [],
      metrics: metrics ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { user, membership, adminSupabase } = auth
    const { id } = await params

    const body = await request.json()
    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'timezone',
      'is_active', 'target_calories', 'target_protein', 'target_steps',
      'target_carbs', 'target_fats', 'target_water_oz', 'weigh_in_day',
      'current_supplements', 'current_peds', 'current_peptides',
      'program_name', 'program_raw_text', 'workout_program',
      'cardio_protocol', 'meal_plan', 'medical_protocol',
      'sms_opt_in', 'instagram_handle', 'leaderboard_opt_in',
    ]

    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Get old values for change tracking (only for program fields)
    const changedProgramFields = Object.keys(updates).filter(f => PROGRAM_FIELDS.includes(f))
    let oldClient: Record<string, unknown> | null = null
    if (changedProgramFields.length > 0) {
      const { data } = await adminSupabase
        .from('clients')
        .select(changedProgramFields.join(', '))
        .eq('id', id)
        .single()
      oldClient = data as Record<string, unknown> | null
    }

    const { data: client, error } = await adminSupabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log program field changes and notify Bryan if someone else made the change
    if (changedProgramFields.length > 0 && oldClient) {
      // Get the user's name for logging
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single()
      const changerName = profile?.full_name || profile?.email || user.email || 'Unknown'

      // Log each changed field
      const changeLogs = changedProgramFields.map(field => ({
        client_id: id,
        changed_by: user.id,
        changed_by_name: changerName,
        field_name: field,
        old_value: oldClient![field] !== undefined ? JSON.parse(JSON.stringify(oldClient![field])) : null,
        new_value: updates[field] !== undefined ? JSON.parse(JSON.stringify(updates[field])) : null,
      }))

      await adminSupabase
        .from('program_change_log')
        .insert(changeLogs)
        .then(() => {}) // fire and forget

      // If the user is NOT Bryan, send notification
      if (user.id !== BRYAN_USER_ID) {
        const clientName = `${client.first_name} ${client.last_name}`
        const fieldList = changedProgramFields.join(', ')

        const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  body { margin:0; padding:0; background:#0a0a0a; font-family:-apple-system, sans-serif; }
  .container { max-width:600px; margin:0 auto; padding:40px 20px; }
  .logo { color:#FF6A00; font-size:24px; font-weight:900; letter-spacing:3px; text-align:center; margin-bottom:32px; }
  .card { background:#141414; border:1px solid #2a2a2a; border-radius:12px; padding:24px; margin-bottom:16px; }
  h1 { color:#D4A017; font-size:18px; margin:0 0 12px 0; }
  p { color:#999; font-size:14px; line-height:1.6; margin:0 0 8px 0; }
  .field { color:#FF6A00; font-weight:600; }
  .who { color:#fff; font-weight:600; }
</style>
</head>
<body>
<div class="container">
  <div class="logo">FBF ALERT</div>
  <div class="card">
    <h1>Program Change Alert</h1>
    <p>Client: <span class="who">${clientName}</span></p>
    <p>Changed by: <span class="who">${changerName}</span></p>
    <p>Fields modified: <span class="field">${fieldList}</span></p>
    <p style="margin-top:12px;color:#666;font-size:12px;">Review in the dashboard to verify changes are correct.</p>
  </div>
</div>
</body>
</html>`

        for (const email of ADMIN_EMAILS) {
          sendEmail({
            to: email,
            subject: `Program Change Alert: ${clientName} — modified by ${changerName}`,
            html: emailHtml,
          }).catch(err => console.error('Change notification email failed:', err))
        }
      }
    }

    return NextResponse.json({ client })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

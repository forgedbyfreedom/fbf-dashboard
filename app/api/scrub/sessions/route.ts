import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import Papa from 'papaparse'

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

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { membership, adminSupabase } = auth

    const { data: sessions, error } = await adminSupabase
      .from('scrub_sessions')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sessions: sessions ?? [] })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { user, membership, adminSupabase } = auth

    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const columnMappingStr = formData.get('column_mapping') as string

    if (!file || !name) {
      return NextResponse.json({ error: 'File and name are required' }, { status: 400 })
    }

    const csvText = await file.text()
    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    })

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json({ error: 'Failed to parse CSV' }, { status: 400 })
    }

    const rows = parsed.data
    const columnMapping = columnMappingStr ? JSON.parse(columnMappingStr) : null

    // Save column mapping for org
    if (columnMapping) {
      await adminSupabase
        .from('scrub_column_mappings')
        .upsert({
          organization_id: membership.organization_id,
          mapping: columnMapping,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'organization_id' })
    }

    // Create session
    const { data: session, error: sessionError } = await adminSupabase
      .from('scrub_sessions')
      .insert({
        organization_id: membership.organization_id,
        name,
        csv_file_name: file.name,
        total_rows: rows.length,
        column_mapping: columnMapping,
        status: 'pending',
        created_by: user.id,
      })
      .select()
      .single()

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 })
    }

    // Insert visitors in batches of 500
    const batchSize = 500
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map((row, idx) => ({
        session_id: session.id,
        row_number: i + idx + 1,
        raw_data: row,
        result: 'pending' as const,
        denial_reasons: [],
      }))

      const { error: insertError } = await adminSupabase
        .from('scrub_visitors')
        .insert(batch)

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ session, headers: parsed.meta.fields || [] })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

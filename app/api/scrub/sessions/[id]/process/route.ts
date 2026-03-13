import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { evaluateVisitor, type ScrubRule } from '@/lib/scrub/rulesEngine'

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

export async function POST(
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

    // Get session
    const { data: session, error: sessionError } = await adminSupabase
      .from('scrub_sessions')
      .select('*')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Mark as processing
    await adminSupabase
      .from('scrub_sessions')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', id)

    // Load active rules
    const { data: rules } = await adminSupabase
      .from('scrub_rules')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .eq('is_active', true)
      .order('priority', { ascending: false })

    const activeRules: ScrubRule[] = (rules || []).map(r => ({
      id: r.id,
      name: r.name,
      field: r.field,
      operator: r.operator,
      value: r.value,
      action: r.action,
      priority: r.priority,
      is_active: r.is_active,
      condition_field: r.condition_field,
      condition_operator: r.condition_operator,
      condition_value: r.condition_value,
    }))

    // Snapshot rules into session
    await adminSupabase
      .from('scrub_sessions')
      .update({ rules_snapshot: activeRules })
      .eq('id', id)

    const columnMapping = session.column_mapping as Record<string, string> | null

    // Process visitors in batches
    const batchSize = 500
    let offset = 0
    let autoApproved = 0
    let autoDenied = 0
    let manualReview = 0

    while (true) {
      const { data: visitors } = await adminSupabase
        .from('scrub_visitors')
        .select('id, raw_data')
        .eq('session_id', id)
        .order('row_number')
        .range(offset, offset + batchSize - 1)

      if (!visitors || visitors.length === 0) break

      // Evaluate each visitor
      const updates: { id: string; result: string; denial_reasons: unknown[]; matched_rule_id: string | undefined; matched_rule_name: string | undefined }[] = []

      for (const visitor of visitors) {
        const row = visitor.raw_data as Record<string, string>
        const evaluation = evaluateVisitor(row, activeRules, columnMapping || undefined)

        updates.push({
          id: visitor.id,
          result: evaluation.result,
          denial_reasons: evaluation.denial_reasons,
          matched_rule_id: evaluation.matched_rule_id,
          matched_rule_name: evaluation.matched_rule_name,
        })

        if (evaluation.result === 'approved') autoApproved++
        else if (evaluation.result === 'denied') autoDenied++
        else manualReview++
      }

      // Batch update results
      for (const update of updates) {
        await adminSupabase
          .from('scrub_visitors')
          .update({
            result: update.result,
            denial_reasons: update.denial_reasons,
            matched_rule_id: update.matched_rule_id || null,
            matched_rule_name: update.matched_rule_name || null,
          })
          .eq('id', update.id)
      }

      offset += batchSize
    }

    // Update session summary
    const { data: updatedSession } = await adminSupabase
      .from('scrub_sessions')
      .update({
        status: 'completed',
        auto_approved: autoApproved,
        auto_denied: autoDenied,
        manual_review: manualReview,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    return NextResponse.json({ session: updatedSession })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

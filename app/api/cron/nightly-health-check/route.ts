import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const RENDER_API = 'https://forged-by-freedom-api-nm4f.onrender.com'
const ADMIN_KEY = process.env.ADMIN_KEY || ''
const CRON_SECRET = process.env.CRON_SECRET || ''

interface CheckResult {
  name: string
  status: 'pass' | 'fail'
  detail?: string
  error?: string
}

interface RepairAction {
  action: string
  detail: string
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: {
    timestamp: string
    checks: CheckResult[]
    failures: CheckResult[]
    repairs: RepairAction[]
    overall: string
  } = {
    timestamp: new Date().toISOString(),
    checks: [],
    failures: [],
    repairs: [],
    overall: 'healthy',
  }

  async function check(name: string, fn: () => Promise<{ detail: string }>) {
    try {
      const result = await fn()
      results.checks.push({ name, status: 'pass', detail: result.detail })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      results.checks.push({ name, status: 'fail', error })
      results.failures.push({ name, error })
      results.overall = 'degraded'
    }
  }

  const supabase = createAdminClient()

  // 1. Supabase connectivity
  await check('supabase_connection', async () => {
    const { count, error } = await supabase.from('clients').select('id', { count: 'exact', head: true })
    if (error) throw new Error(error.message)
    return { detail: `${count} clients in database` }
  })

  // 2. Render API health
  await check('render_api', async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    const r = await fetch(`${RENDER_API}/health`, { signal: controller.signal })
    clearTimeout(timer)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const data = await r.json()
    return { detail: `API healthy, uptime: ${Math.round(data.uptime / 3600)}h` }
  })

  // 3. Render full system health check
  await check('render_system_check', async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60000)
    const r = await fetch(`${RENDER_API}/api/system/health-check?key=${ADMIN_KEY}`, { signal: controller.signal })
    clearTimeout(timer)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const data = await r.json()
    if (data.failures && data.failures.length > 0) {
      throw new Error(`${data.failures.length} sub-checks failed: ${data.failures.map((f: { name: string }) => f.name).join(', ')}`)
    }
    if (data.repairs && data.repairs.length > 0) {
      for (const repair of data.repairs) {
        results.repairs.push(repair)
      }
    }
    return { detail: `${data.checks?.length || 0} sub-checks passed` }
  })

  // 4. Dashboard API self-check
  await check('dashboard_api', async () => {
    const { data, error } = await supabase.from('checkins').select('id', { count: 'exact', head: true })
    if (error) throw new Error(error.message)
    return { detail: 'Dashboard DB queries working' }
  })

  // 5. Auth system
  await check('auth_system', async () => {
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1 })
    if (error) throw new Error(error.message)
    return { detail: 'Auth system responding' }
  })

  // 6. Chat realtime tables
  await check('chat_tables', async () => {
    const { error: chErr } = await supabase.from('chat_channels').select('id', { count: 'exact', head: true })
    if (chErr) throw new Error(chErr.message)
    const { error: msgErr } = await supabase.from('chat_messages').select('id', { count: 'exact', head: true })
    if (msgErr) throw new Error(msgErr.message)
    return { detail: 'Chat tables accessible' }
  })

  // 7. Gamification tables
  await check('gamification_tables', async () => {
    const { error: bErr } = await supabase.from('badge_definitions').select('id', { count: 'exact', head: true })
    if (bErr) throw new Error(bErr.message)
    const { error: sErr } = await supabase.from('client_streaks').select('client_id', { count: 'exact', head: true })
    if (sErr) throw new Error(sErr.message)
    return { detail: 'Gamification tables accessible' }
  })

  // 8. Stale metrics auto-repair
  await check('metrics_freshness', async () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: staleMetrics, error } = await supabase
      .from('client_metrics')
      .select('id, client_id')
      .lt('updated_at', oneDayAgo)
    if (error) throw new Error(error.message)

    const staleCount = (staleMetrics || []).length
    if (staleCount > 0) {
      // Auto-repair: trigger metrics recompute by touching the client
      for (const m of (staleMetrics || []).slice(0, 20)) {
        await supabase.from('client_metrics')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', m.id)
      }
      results.repairs.push({
        action: 'metrics_refresh',
        detail: `Refreshed ${Math.min(staleCount, 20)} of ${staleCount} stale metrics`,
      })
    }
    return { detail: `${staleCount} stale metrics (auto-repaired if any)` }
  })

  // 9. Website reachability
  await check('website', async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    const r = await fetch('https://www.forgedbyfreedom.org/', { signal: controller.signal })
    clearTimeout(timer)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return { detail: 'forgedbyfreedom.org responding' }
  })

  // 10. Storage buckets
  await check('storage', async () => {
    const { data, error } = await supabase.storage.listBuckets()
    if (error) throw new Error(error.message)
    return { detail: `${(data || []).length} storage buckets` }
  })

  // Send ntfy notification
  const ntfyTopic = process.env.NTFY_TOPIC || 'fbf-leads-bryan'
  if (results.failures.length > 0) {
    await fetch(`https://ntfy.sh/${ntfyTopic}`, {
      method: 'POST',
      headers: {
        Title: `⚠️ FBF Nightly Health: ${results.failures.length} issue(s)`,
        Priority: 'high',
        Tags: 'warning',
      },
      body: `${results.failures.length} failure(s) at ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}:\n\n${results.failures.map(f => `❌ ${f.name}: ${f.error}`).join('\n')}\n\n${results.repairs.length > 0 ? `🔧 Auto-repairs:\n${results.repairs.map(r => `${r.action}: ${r.detail}`).join('\n')}` : ''}`,
    }).catch(() => {})
  } else {
    await fetch(`https://ntfy.sh/${ntfyTopic}`, {
      method: 'POST',
      headers: {
        Title: '✅ FBF Nightly Health: All Clear',
        Priority: 'low',
        Tags: 'white_check_mark',
      },
      body: `All ${results.checks.length} checks passed at ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}.\n${results.repairs.length > 0 ? `Auto-repairs: ${results.repairs.map(r => r.action).join(', ')}` : 'No repairs needed.'}`,
    }).catch(() => {})
  }

  return NextResponse.json(results)
}

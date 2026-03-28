import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const SUPABASE_URL = 'https://sdrsoccfingecvlzrlym.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const RESEND_KEY = process.env.RESEND_API_KEY

if (!SUPABASE_KEY) { console.error('Set SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

function buildEmail(firstName, link) {
  return `<div style="background:#0a0a0a;padding:40px 20px;font-family:-apple-system,sans-serif;">
<div style="max-width:600px;margin:0 auto;">
<div style="text-align:center;margin-bottom:32px;">
<div style="color:#FF6A00;font-size:24px;font-weight:bold;letter-spacing:2px;">FORGED BY FREEDOM</div>
</div>
<div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:16px;">
<h1 style="color:#fff;font-size:20px;margin:0 0 12px;">Hey ${firstName}!</h1>
<p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 12px;">Just a quick reminder — your custom coaching program is waiting to be built. We just need you to complete a short intake form (about 3 minutes).</p>
<div style="background:#0a0a0a;border:2px solid #22c55e;border-radius:10px;padding:16px;margin:16px 0;">
<p style="color:#22c55e;font-size:18px;font-weight:700;margin:0 0 8px;text-align:center;">100% FREE — No Catches</p>
<p style="color:#ccc;font-size:14px;line-height:1.6;margin:0;text-align:center;">This is a beta test. There is no charge for any of this.<br>You will never be back-billed. There are no hidden fees,<br>no credit card required, no strings attached.<br><strong style="color:#fff;">Everything is completely free.</strong></p>
</div>
<p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 12px;">Once you submit the form, our AI builds a custom workout program, meal plan, and supplement protocol tailored to YOUR goals. Coach Bryan reviews and approves everything personally before it hits your app.</p>
</div>
<div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:24px;text-align:center;margin-bottom:16px;">
<p style="color:#ccc;margin-bottom:16px;font-size:14px;">Click below to get started:</p>
<a href="${link}" style="display:inline-block;background:#FF6A00;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;">Complete Intake Form</a>
<p style="font-size:11px;color:#555;margin-top:16px;">Takes about 3 minutes. This link is unique to you.</p>
</div>
<div style="text-align:center;margin-top:24px;">
<p style="color:#555;font-size:12px;">Forged by Freedom Strength &amp; Nutrition</p>
<p style="color:#555;font-size:12px;">Questions? Just reply — Coach Bryan here.</p>
</div>
</div>
</div>`
}

async function sendEmail(to, firstName, link) {
  if (RESEND_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Forged by Freedom <onboarding@resend.dev>',
        to,
        subject: `${firstName} — Quick reminder: your free FBF program is waiting`,
        html: buildEmail(firstName, link),
      }),
    })
    const data = await res.json()
    if (res.ok) return { ok: true, id: data.id }
    return { ok: false, error: data.message || data.error || 'Unknown' }
  }

  // Fallback to Render SMTP
  const renderUrl = process.env.RENDER_API_URL || 'https://forged-by-freedom-api-nm4f.onrender.com'
  const res = await fetch(`${renderUrl}/api/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: process.env.ADMIN_KEY || '',
      to,
      subject: `${firstName} — Quick reminder: your free FBF program is waiting`,
      html: buildEmail(firstName, link),
    }),
  })
  if (res.ok) return { ok: true }
  return { ok: false, error: await res.text() }
}

async function main() {
  // Get all clients with active (unsent/incomplete) tokens
  const { data: tokens } = await sb.from('intake_tokens').select('client_id').eq('status', 'active')
  const pendingIds = [...new Set((tokens || []).map(t => t.client_id))]

  if (!pendingIds.length) { console.log('No pending clients'); return }

  const { data: clients } = await sb.from('clients').select('id, first_name, last_name, email').in('id', pendingIds).eq('is_active', true)

  const results = []

  for (const c of clients || []) {
    if (!c.email) {
      results.push({ name: `${c.first_name} ${c.last_name}`, status: 'SKIPPED', reason: 'no email' })
      continue
    }

    // Create fresh token
    const rawToken = crypto.randomUUID() + crypto.randomUUID()
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex')

    await sb.from('intake_tokens').update({ status: 'revoked' }).eq('client_id', c.id).eq('status', 'active')
    await sb.from('intake_tokens').insert({ client_id: c.id, token_hash: hash })

    const link = `https://fbf-dashboard.vercel.app/intake/${rawToken}`

    try {
      const result = await sendEmail(c.email, c.first_name, link)
      results.push({
        name: `${c.first_name} ${c.last_name}`,
        email: c.email,
        status: result.ok ? '✅ SENT' : '❌ FAILED',
        error: result.error || undefined,
      })
    } catch (err) {
      results.push({
        name: `${c.first_name} ${c.last_name}`,
        email: c.email,
        status: '❌ ERROR',
        error: err.message,
      })
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 500))
  }

  console.log('\n═══════════════════════════════════════════')
  console.log('  FBF INTAKE REMINDER — SEND RECEIPT')
  console.log('  ' + new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
  console.log('═══════════════════════════════════════════\n')

  for (const r of results) {
    console.log(`  ${r.status} — ${r.name}${r.email ? ` (${r.email})` : ''}${r.error ? ` [${r.error}]` : ''}`)
  }

  const sent = results.filter(r => r.status.includes('✅')).length
  const failed = results.filter(r => r.status.includes('❌')).length
  const skipped = results.filter(r => r.status === 'SKIPPED').length

  console.log(`\n  Total: ${results.length} | Sent: ${sent} | Failed: ${failed} | Skipped: ${skipped}\n`)
}

main().catch(console.error)

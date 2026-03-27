import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

const DEFAULT_ORG_ID = 'a0000000-0000-0000-0000-000000000001'

/**
 * POST /api/webhooks/new-lead
 *
 * Called by the Render backend when a new lead application is approved.
 * Creates a client record, sends the intake form, and starts the pipeline.
 *
 * Body: { name, email, phone, primary_goal, commitment_level, lead_id? }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret (optional — shared with Render backend)
    const secret = request.headers.get('x-webhook-secret')
    const expected = process.env.N8N_WEBHOOK_SECRET || process.env.ADMIN_KEY
    if (expected && secret !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, phone, primary_goal, commitment_level, lead_id } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'name and email required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Parse name
    const nameParts = name.trim().split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    // Check if client already exists by email
    const { data: existing } = await supabase
      .from('clients')
      .select('id, email')
      .eq('email', email)
      .limit(1)
      .maybeSingle()

    let clientId: string

    if (existing) {
      clientId = existing.id
    } else {
      // Create new client
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email,
          phone: phone || null,
          organization_id: DEFAULT_ORG_ID,
          is_active: true,
        })
        .select('id')
        .single()

      if (createError || !newClient) {
        console.error('Failed to create client:', createError)
        return NextResponse.json({ error: `Client creation failed: ${createError?.message}` }, { status: 500 })
      }

      clientId = newClient.id

      // Create metrics row
      await supabase.from('client_metrics').insert({ client_id: clientId }).catch(() => {})
    }

    // Generate intake token
    const rawToken = crypto.randomUUID() + crypto.randomUUID()
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawToken))
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Revoke existing active tokens
    await supabase
      .from('intake_tokens')
      .update({ status: 'revoked' })
      .eq('client_id', clientId)
      .eq('status', 'active')

    // Create new token
    const { error: tokenError } = await supabase
      .from('intake_tokens')
      .insert({ client_id: clientId, token_hash: tokenHash })

    if (tokenError) {
      console.error('Token creation failed:', tokenError)
      return NextResponse.json({ error: `Token creation failed: ${tokenError.message}` }, { status: 500 })
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://fbf-dashboard.vercel.app').trim().replace(/\/+$/, '')
    const onboardingLink = `${appUrl}/intake/${rawToken}`

    // Send intake email
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { color: #FF6A00; font-size: 24px; font-weight: bold; letter-spacing: 2px; }
    .card { background: #141414; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
    h1 { color: #ffffff; font-size: 20px; margin: 0 0 8px 0; }
    p { color: #999999; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0; }
    .highlight { color: #D4A017; }
    .btn { display: inline-block; background: #FF6A00; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px; }
    .footer { text-align: center; margin-top: 32px; }
    .footer p { color: #555555; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FORGED BY FREEDOM</div>
    </div>
    <div class="card">
      <h1>Welcome to FBF Coaching!</h1>
      <p>Hey ${firstName},</p>
      <p>We're excited to start working with you! Before we build your custom program, please complete your <span class="highlight">intake form and liability waiver</span>. This helps us design a plan tailored specifically to your goals.</p>
      <p>It takes about 3 minutes.</p>
    </div>
    <div class="card" style="text-align: center;">
      <p style="margin-bottom: 16px; color: #ccc;">Click below to get started:</p>
      <a href="${onboardingLink}" class="btn">Complete Intake Form</a>
      <p style="font-size: 11px; color: #555; margin-top: 16px;">This link is unique to you. Do not share it.</p>
    </div>
    <div class="footer">
      <p>Forged by Freedom Strength & Nutrition</p>
      <p>Questions? Reply to this email or reach out to your coach.</p>
    </div>
  </div>
</body>
</html>`

    await sendEmail({
      to: email,
      subject: `${firstName}, complete your FBF intake form`,
      html: htmlBody,
    })

    // Send ntfy notification confirming the pipeline started
    const ntfyTopic = process.env.NTFY_TOPIC || 'fbf-leads-bryan'
    await fetch(`https://ntfy.sh/${ntfyTopic}`, {
      method: 'POST',
      headers: {
        Title: `✅ Intake Sent: ${firstName} ${lastName}`,
        Priority: 'default',
        Tags: 'email,white_check_mark',
      },
      body: `Client created & intake form sent to ${email}\nGoal: ${primary_goal || 'Not specified'}\nCommitment: ${commitment_level || 'Not specified'}`,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      client_id: clientId,
      onboarding_link: onboardingLink,
    })
  } catch (err) {
    console.error('New lead webhook error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

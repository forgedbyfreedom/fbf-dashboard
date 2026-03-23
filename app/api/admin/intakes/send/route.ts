import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-check'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // Verify org_admin
    const { data: membership } = await adminSupabase
      .from('org_members')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'org_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { client_id, email } = await request.json()

    if (!client_id || !email) {
      return NextResponse.json({ error: 'client_id and email are required' }, { status: 400 })
    }

    // Get client info
    const { data: client } = await adminSupabase
      .from('clients')
      .select('id, first_name, last_name, email')
      .eq('id', client_id)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Generate intake token
    const rawToken = crypto.randomUUID() + crypto.randomUUID()
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawToken))
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Revoke any existing active tokens for this client
    await adminSupabase
      .from('intake_tokens')
      .update({ status: 'revoked' })
      .eq('client_id', client_id)
      .eq('status', 'active')

    // Create new token
    const { error: tokenError } = await adminSupabase
      .from('intake_tokens')
      .insert({
        client_id,
        token_hash: tokenHash,
      })

    if (tokenError) {
      return NextResponse.json({ error: `Token creation failed: ${tokenError.message}` }, { status: 500 })
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || 'localhost:3000'}`).trim().replace(/\/+$/, '')
    const onboardingLink = `${appUrl}/intake/${rawToken}`

    // Send email with onboarding link
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
      <h1>Welcome to FBF Coaching</h1>
      <p>Hey ${client.first_name},</p>
      <p>We're excited to start working with you! Before we begin, please complete your <span class="highlight">intake form and liability waiver</span>. This helps us build a program tailored to your goals.</p>
    </div>
    <div class="card" style="text-align: center;">
      <p style="margin-bottom: 16px; color: #ccc;">Click below to complete your onboarding:</p>
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
      subject: `${client.first_name}, complete your FBF intake form`,
      html: htmlBody,
    })

    return NextResponse.json({ success: true, onboarding_link: onboardingLink })
  } catch (err) {
    console.error('Send intake error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

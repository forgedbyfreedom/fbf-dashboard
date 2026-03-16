import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

const PORTAL_URL = 'https://fbf-dashboard.vercel.app/portal'

function buildFbfEmailWrapper(bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { color: #FF6A00; font-size: 24px; font-weight: 900; letter-spacing: 3px; }
    .tagline { color: #D4A017; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; margin-top: 6px; }
    .card { background: #141414; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
    h1 { color: #ffffff; font-size: 20px; margin: 0 0 16px 0; }
    h2 { color: #ffffff; font-size: 16px; margin: 0 0 12px 0; }
    p { color: #999999; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0; }
    .highlight { color: #FF6A00; font-weight: 600; }
    .gold { color: #D4A017; }
    .credential-box { background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .credential-label { color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .credential-value { color: #ffffff; font-size: 15px; font-weight: 600; font-family: monospace; }
    .btn { display: inline-block; background: #FF6A00; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; }
    .btn:hover { background: #FF8533; }
    .warning { color: #D4A017; font-size: 12px; font-style: italic; }
    .footer { text-align: center; margin-top: 32px; }
    .footer p { color: #555555; font-size: 12px; }
    .disclaimer { border-top: 1px solid #2a2a2a; padding: 16px 0; margin-top: 16px; text-align: center; }
    .disclaimer p { font-size: 10px; color: #666; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FORGED BY FREEDOM</div>
      <div class="tagline">Strength &bull; Discipline &bull; Freedom</div>
    </div>
    ${bodyContent}
    <div class="footer">
      <p>Forged by Freedom Coaching</p>
      <p>Questions? Reply directly to your coach.</p>
    </div>
    <div class="disclaimer">
      <p>This email is for informational purposes only and does not constitute medical advice. All program recommendations are informational only. Consult a licensed physician before implementing changes.</p>
      <p style="color: #FF6A00; margin-top: 4px;">FORGED BY FREEDOM STRENGTH & NUTRITION</p>
    </div>
  </div>
</body>
</html>`
}

function buildWelcomeEmail(name: string, email: string, password: string): string {
  const bodyContent = `
    <div class="card">
      <h1>Welcome to Forged by Freedom</h1>
      <p>Hey ${name || 'there'},</p>
      <p>Your coaching account has been created and you're ready to start your journey. Below are your login credentials to access the <span class="highlight">FBF Client Portal</span>.</p>
      <div class="credential-box">
        <div style="margin-bottom: 12px;">
          <div class="credential-label">Login URL</div>
          <div class="credential-value"><a href="${PORTAL_URL}" style="color: #FF6A00; text-decoration: none;">${PORTAL_URL}</a></div>
        </div>
        <div style="margin-bottom: 12px;">
          <div class="credential-label">Email</div>
          <div class="credential-value">${email}</div>
        </div>
        <div>
          <div class="credential-label">Temporary Password</div>
          <div class="credential-value">${password}</div>
        </div>
      </div>
      <p class="warning">Please change your password after your first login for security.</p>
    </div>
    <div class="card" style="text-align: center;">
      <p style="margin-bottom: 16px; color: #ffffff;">Ready to get started?</p>
      <a href="${PORTAL_URL}" class="btn">Log In to Portal</a>
    </div>`
  return buildFbfEmailWrapper(bodyContent)
}

function buildMassEmailHtml(bodyText: string): string {
  // Convert newlines to <br> and wrap in card
  const formattedBody = bodyText
    .split('\n')
    .map(line => line.trim() === '' ? '<br>' : `<p>${line}</p>`)
    .join('\n')

  const bodyContent = `
    <div class="card">
      ${formattedBody}
    </div>`
  return buildFbfEmailWrapper(bodyContent)
}

// Verify requesting user is org_admin
async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401, user: null }

  const adminSupabase = createAdminClient()
  const { data: membership } = await adminSupabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (membership?.role !== 'org_admin') return { error: 'Forbidden', status: 403, user: null }

  return { error: null, status: 200, user }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const { action } = body

  try {
    switch (action) {
      case 'send_invite': {
        const { email, name, password } = body
        if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

        const html = buildWelcomeEmail(name || '', email, password || 'Forged1')
        await sendEmail({
          to: email,
          subject: 'Welcome to Forged by Freedom — Your Login Credentials',
          html,
        })

        return NextResponse.json({ success: true })
      }

      case 'send_mass_email': {
        const { recipients, subject, body: emailBody } = body
        if (!recipients?.length) return NextResponse.json({ error: 'No recipients selected' }, { status: 400 })
        if (!subject) return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
        if (!emailBody) return NextResponse.json({ error: 'Email body is required' }, { status: 400 })

        const html = buildMassEmailHtml(emailBody)
        const results: { email: string; success: boolean; error?: string }[] = []

        for (const recipient of recipients) {
          try {
            await sendEmail({
              to: recipient.email,
              subject,
              html,
            })
            results.push({ email: recipient.email, success: true })
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            results.push({ email: recipient.email, success: false, error: message })
          }
        }

        const sent = results.filter(r => r.success).length
        const failed = results.filter(r => !r.success).length

        return NextResponse.json({ success: true, sent, failed, results })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

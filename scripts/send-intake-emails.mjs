/**
 * Send intake form emails to all clients who haven't completed one.
 * Uses Supabase service role to generate tokens + Render SMTP relay to send.
 */
import crypto from 'crypto'

const SUPABASE_URL = 'https://sdrsoccfingecvlzrlym.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkcnNvY2NmaW5nZWN2bHpybHltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIxMTUwNiwiZXhwIjoyMDg3Nzg3NTA2fQ.Ntj1tTucrJ0qTGdbA46tUgXd6gm7hzuN7Soq7Kt2pcw'
const RENDER_URL = 'https://forged-by-freedom-api-nm4f.onrender.com'
const ADMIN_KEY = 'DISCIPLINE'
const APP_URL = 'https://fbf-dashboard.vercel.app'

const headers = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
}

async function supabaseQuery(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  })
  // Use the raw REST API instead
  return null
}

// Fetch clients with no intake form
async function getClientsWithoutIntake() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?select=id,first_name,last_name,email&email=not.is.null&order=last_name`,
    { headers }
  )
  const allClients = await res.json()

  // Fetch clients that DO have intake forms
  const intakeRes = await fetch(
    `${SUPABASE_URL}/rest/v1/client_intake?select=client_id`,
    { headers }
  )
  const intakes = await intakeRes.json()
  const clientsWithIntake = new Set(intakes.map(i => i.client_id))

  // Filter out clients who already have intake
  return allClients.filter(c => !clientsWithIntake.has(c.id) && c.email)
}

async function generateToken(clientId) {
  const rawToken = crypto.randomUUID() + crypto.randomUUID()
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

  // Revoke existing active tokens
  await fetch(
    `${SUPABASE_URL}/rest/v1/intake_tokens?client_id=eq.${clientId}&status=eq.active`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'revoked' }),
    }
  )

  // Insert new token
  const res = await fetch(`${SUPABASE_URL}/rest/v1/intake_tokens`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ client_id: clientId, token_hash: tokenHash }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token insert failed for ${clientId}: ${err}`)
  }

  return rawToken
}

async function sendEmail(to, subject, html) {
  const res = await fetch(`${RENDER_URL}/api/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: ADMIN_KEY, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Email failed to ${to}: ${err}`)
  }
  return await res.json()
}

function buildIntakeEmail(firstName, intakeLink) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .logo { color: #FF6A00; font-size: 24px; font-weight: bold; letter-spacing: 2px; text-align: center; margin-bottom: 32px; }
    .card { background: #141414; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
    h1 { color: #ffffff; font-size: 20px; margin: 0 0 8px 0; }
    p { color: #999999; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0; }
    .highlight { color: #D4A017; }
    .btn { display: inline-block; background: #FF6A00; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px; }
    .footer p { color: #555555; font-size: 12px; text-align: center; }
    .disclaimer { font-size: 10px; color: #666; line-height: 1.6; border-top: 1px solid #2a2a2a; padding-top: 16px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">FORGED BY FREEDOM</div>
    <div class="card">
      <h1>Complete Your FBF Onboarding</h1>
      <p>Hey ${firstName},</p>
      <p>We noticed your <span class="highlight">intake form and liability waiver</span> are still pending. We need this completed before we can build your custom training and nutrition program.</p>
      <p>It takes about 5 minutes and covers your health history, goals, training background, and preferences — everything we need to dial in your program.</p>
    </div>
    <div class="card" style="text-align: center;">
      <p style="color: #ccc; margin-bottom: 16px;">Click below to complete your intake form:</p>
      <a href="${intakeLink}" class="btn">Complete My Intake Form</a>
      <p style="font-size: 11px; color: #555; margin-top: 16px;">This link is unique to you — do not share it.</p>
    </div>
    <div class="card" style="background: #0f0f0f;">
      <p style="font-size: 13px; color: #ccc; margin-bottom: 4px;"><strong style="color: #FF6A00;">Why this matters:</strong></p>
      <p>Without your intake form and signed waiver, we can't safely prescribe training loads, calorie targets, or supplement protocols. Your safety and results depend on us knowing your full picture.</p>
    </div>
    <div class="footer">
      <p>Forged by Freedom Strength &amp; Nutrition</p>
      <p>Questions? Reply to this email or reach out to Coach Bryan directly.</p>
      <div class="disclaimer">
        This message is for educational and program onboarding purposes only. It does not constitute medical advice. Consult a licensed physician before beginning any exercise or nutrition program.
      </div>
    </div>
  </div>
</body>
</html>`
}

async function main() {
  console.log('Fetching clients without intake forms...')
  const clients = await getClientsWithoutIntake()

  // Exclude Bryan's own coach/admin accounts and Wendy's old record
  const EXCLUDE_IDS = new Set([
    '179712ea-a4c6-4ec0-89da-cc6cd3c0aeea', // Bryan (no email, already filtered)
    '09ddd273-81fe-4d21-b8d1-38f67d3aa7f9', // Bryan test (no email)
    '8aff0500-605c-4bc4-a584-64073e7e977b', // Wendy old no-login record
    'a1c9a69f-235e-4820-9535-b55e71847e67', // Bryan Antonelli proton (HAS intake, won't appear)
  ])

  const targets = clients.filter(c => !EXCLUDE_IDS.has(c.id))

  console.log(`\nFound ${targets.length} clients to email:\n`)
  targets.forEach(c => console.log(`  - ${c.first_name} ${c.last_name} <${c.email}>`))
  console.log()

  let sent = 0
  let failed = 0

  for (const client of targets) {
    try {
      process.stdout.write(`Sending to ${client.first_name} ${client.last_name} (${client.email})... `)

      const rawToken = await generateToken(client.id)
      const intakeLink = `${APP_URL}/intake/${rawToken}`
      const html = buildIntakeEmail(client.first_name, intakeLink)

      await sendEmail(
        client.email,
        `${client.first_name}, your FBF intake form is waiting`,
        html
      )

      console.log('✓ sent')
      sent++

      // Small delay to avoid overwhelming the SMTP relay
      await new Promise(r => setTimeout(r, 500))
    } catch (err) {
      console.log(`✗ FAILED: ${err.message}`)
      failed++
    }
  }

  console.log(`\nDone. ${sent} sent, ${failed} failed.`)
}

main().catch(console.error)

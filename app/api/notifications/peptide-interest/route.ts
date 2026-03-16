import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSMS, isTwilioConfigured } from '@/lib/twilio'
import { sendEmail } from '@/lib/email'

const NOTIFY_CONTACTS = [
  { name: 'Bryan', phone: process.env.BRYAN_PHONE || '+17757418213', email: 'forgedbyfreedom@proton.me' },
  { name: 'Wendy', phone: process.env.WENDY_PHONE || '+17757418209', email: process.env.WENDY_EMAIL || 'wantonelli2@comcast.net' },
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
  return null
}

function buildEmailHtml(clientName: string, peptideName: string, actionText: string, clientEmail: string, clientPhone: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, sans-serif; }
  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
  .header { text-align: center; margin-bottom: 24px; }
  .logo { color: #FF6A00; font-size: 20px; font-weight: bold; letter-spacing: 2px; }
  .card { background: #141414; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
  h1 { color: #ffffff; font-size: 18px; margin: 0 0 12px 0; }
  p { color: #999; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0; }
  .highlight { color: #FF6A00; font-weight: 700; }
  .detail { color: #ccc; font-size: 13px; }
  .footer { text-align: center; margin-top: 24px; }
  .footer p { color: #555; font-size: 11px; }
</style></head>
<body>
  <div class="container">
    <div class="header"><div class="logo">FORGED BY FREEDOM</div></div>
    <div class="card">
      <h1>🧬 Peptide Interest Alert</h1>
      <p><strong class="highlight">${clientName}</strong> ${actionText}:</p>
      <p style="font-size: 20px; color: #FF6A00; font-weight: 800; margin: 16px 0;">${peptideName}</p>
      <p class="detail"><strong>Client:</strong> ${clientName}</p>
      <p class="detail"><strong>Email:</strong> ${clientEmail}</p>
      <p class="detail"><strong>Phone:</strong> ${clientPhone}</p>
      <p style="margin-top: 16px;">Follow up in the FBF app or contact them directly.</p>
    </div>
    <div class="footer"><p>Forged by Freedom Coaching — Automated Alert</p></div>
  </div>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { peptide_id, peptide_name, action } = await request.json()
    if (!peptide_id || !peptide_name) {
      return NextResponse.json({ error: 'peptide_id and peptide_name required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    const { data: client } = await adminSupabase
      .from('clients')
      .select('id, first_name, last_name, email, phone')
      .eq('user_id', user.id)
      .single()

    const clientName = client
      ? `${client.first_name} ${client.last_name}`
      : user.email || 'Unknown client'
    const clientEmail = client?.email || user.email || 'N/A'
    const clientPhone = client?.phone || 'N/A'

    const actionText = action === 'book_consult'
      ? 'wants to BOOK A PEPTIDE CONSULT about'
      : 'wants MORE INFORMATION on'

    const smsBody = `🧬 FBF Peptide Alert\n\n${clientName} ${actionText}:\n→ ${peptideName}\n\nEmail: ${clientEmail}\nPhone: ${clientPhone}\n\nFollow up in the FBF app or call directly.`

    const results: string[] = []

    // Send SMS to both Bryan and Wendy
    if (isTwilioConfigured()) {
      for (const contact of NOTIFY_CONTACTS) {
        if (contact.phone) {
          try {
            await sendSMS({ to: contact.phone, body: smsBody })
            results.push(`SMS → ${contact.name}`)
          } catch (err) {
            results.push(`SMS failed → ${contact.name}`)
          }
        }
      }
    }

    // Send email to both Bryan and Wendy
    const emailSubject = `🧬 ${clientName} ${action === 'book_consult' ? 'wants a peptide consult' : `interested in ${peptideName}`}`
    const emailHtml = buildEmailHtml(clientName, peptideName, actionText, clientEmail, clientPhone)

    for (const contact of NOTIFY_CONTACTS) {
      if (contact.email) {
        try {
          await sendEmail({ to: contact.email, subject: emailSubject, html: emailHtml })
          results.push(`Email → ${contact.name}`)
        } catch {
          results.push(`Email failed → ${contact.name}`)
        }
      }
    }

    // Log to database
    await adminSupabase
      .from('peptide_interests')
      .insert({
        client_id: client?.id || null,
        user_id: user.id,
        peptide_id,
        peptide_name,
        action: action || 'more_info',
      })
      .then(() => results.push('Logged to DB'))
      .catch(() => results.push('DB log skipped'))

    return NextResponse.json({ success: true, notifications: results })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

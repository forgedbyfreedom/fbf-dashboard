interface SendEmailOptions {
  to: string
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType?: string
  }>
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured — skipping email send')
    return null
  }

  // On Resend free tier, we can only send to the account owner email
  // Send to forgedbyfreedom@gmail.com with the intended recipient in the subject
  // Gmail forwarding rules will route to Bryan and Wendy
  const canSendTo = to.includes('forgedbyfreedom@gmail.com')
  const actualTo = canSendTo ? to : 'forgedbyfreedom@gmail.com'
  const cleanSubject = subject.replace(/[\n\r]/g, ' ').trim()
  const actualSubject = canSendTo ? cleanSubject : `[FWD ${to}] ${cleanSubject}`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to: actualTo,
      subject: actualSubject,
      html,
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error('Resend error:', data)
    throw new Error(`Email failed: ${data.message || JSON.stringify(data)}`)
  }

  return data
}

export function buildReportEmail(clientName: string, coachName: string, reportType: string, dateRange: string): string {
  return `
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
    .btn { display: inline-block; background: #FF6A00; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; }
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
      <h1>Your ${reportType === 'weekly' ? 'Weekly' : 'Monthly'} Progress Report</h1>
      <p>Hey ${clientName},</p>
      <p>Your <span class="highlight">${reportType} progress report</span> for ${dateRange} is ready. Check out your stats, trends, and a personal message from Coach ${coachName}.</p>
      <p>Your report is attached as a PDF.</p>
    </div>
    <div class="card" style="text-align: center;">
      <p style="margin-bottom: 16px;">Need personalized guidance?</p>
      <a href="https://forgedbyfreedom.org/ai-coach" class="btn">Talk to AI Coach</a>
    </div>
    <div class="footer">
      <p>Forged by Freedom Coaching</p>
      <p>This report was auto-generated. Reply to your coach directly for questions.</p>
    </div>
    <div style="border-top:1px solid #2a2a2a;padding:16px;margin-top:16px;text-align:center;">
      <p style="font-size:10px;color:#666;line-height:1.6;">This report is for educational purposes only and does not constitute medical advice. All program recommendations are informational only. Consult a licensed physician before implementing changes. This document is confidential — do not share or distribute.</p>
      <p style="font-size:10px;color:#FF6A00;margin-top:4px;">FORGED BY FREEDOM STRENGTH & NUTRITION</p>
    </div>
  </div>
</body>
</html>`
}

import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

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

export async function sendEmail({ to, subject, html, attachments }: SendEmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured — skipping email send')
    return null
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'coach@forgedbyfreedom.org'
  const { data, error } = await getResend().emails.send({
    from: fromEmail,
    to,
    subject,
    html,
    attachments: attachments?.map(a => ({
      filename: a.filename,
      content: a.content,
      content_type: a.contentType || 'application/pdf',
    })),
  })

  if (error) {
    console.error('Resend error:', error)
    throw new Error(`Email send failed: ${error.message}`)
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
  </div>
</body>
</html>`
}

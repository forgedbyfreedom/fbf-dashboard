import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { IntakeData } from '@/lib/program-generator'
import { sendEmail } from '@/lib/email'

const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fbf-dashboard.vercel.app'
const ADMIN_EMAILS = ['forgedbyfreedom@proton.me', 'wantonelli2@comcast.net']

/**
 * POST /api/webhooks/intake-completed
 *
 * Triggered when a client intake is completed (waiver signed).
 * Can be called by:
 *   - Supabase database webhook
 *   - Cron polling endpoint
 *   - Manual trigger from dashboard
 *
 * Body: { intake_id?: string, client_id?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const supabase = createAdminClient()

    let intakeRecord: Record<string, string | number | boolean | null | undefined> | null = null
    let clientRecord: { id: string; first_name: string; last_name: string; email: string | null } | null = null

    // Find the intake — by intake_id or client_id
    if (body.intake_id) {
      const { data } = await supabase
        .from('client_intake')
        .select('*')
        .eq('id', body.intake_id)
        .single()
      intakeRecord = data
    } else if (body.client_id) {
      const { data } = await supabase
        .from('client_intake')
        .select('*')
        .eq('client_id', body.client_id)
        .single()
      intakeRecord = data
    } else {
      return NextResponse.json({ error: 'intake_id or client_id required' }, { status: 400 })
    }

    if (!intakeRecord) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    // Verify intake is complete (waiver accepted)
    if (!intakeRecord.waiver_accepted) {
      return NextResponse.json({ error: 'Intake not yet completed (waiver not accepted)' }, { status: 400 })
    }

    // Skip if already generating or beyond
    const currentStatus = intakeRecord.program_status as string | null
    if (currentStatus && ['generating', 'ready_for_review', 'approved', 'program_delivered'].includes(currentStatus)) {
      return NextResponse.json({
        message: `Intake already in status: ${currentStatus}`,
        status: currentStatus,
      })
    }

    // Get the client record — client_intake has client_id as FK
    let client = null
    if (intakeRecord.client_id) {
      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email')
        .eq('id', intakeRecord.client_id as string)
        .single()
      client = data
    }

    if (!client) {
      return NextResponse.json({ error: 'Client not found for this intake' }, { status: 404 })
    }
    clientRecord = client
    const clientId = client.id
    const intakeId = intakeRecord!.id as string

    // Update intake status to 'generating'
    await supabase
      .from('client_intake')
      .update({ program_status: 'generating' })
      .eq('id', intakeId)

    // Create a program_reviews record
    const { data: review, error: reviewError } = await supabase
      .from('program_reviews')
      .insert({
        client_id: clientId,
        intake_id: intakeId,
        status: 'generating',
      })
      .select()
      .single()

    if (reviewError) {
      console.error('Failed to create program review:', reviewError)
      return NextResponse.json({ error: 'Failed to create review record' }, { status: 500 })
    }

    // Fire-and-forget: tell Render to generate the program asynchronously
    // Vercel CANNOT wait for Claude (30-90s) — it will timeout.
    // Render saves directly to the database when done, then ntfy notifies Bryan.
    try {
      const renderUrl = process.env.RENDER_API_URL || 'https://forged-by-freedom-api-nm4f.onrender.com'
      const adminKey = process.env.ADMIN_KEY || ''
      const clientName = `${client.first_name} ${client.last_name}`
      const reviewUrl = `${DASHBOARD_URL}/program-review/${review.id}`

      // Fire and forget — don't await the response
      fetch(`${renderUrl}/api/intake/generate-program`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intake_id: intakeId,
          key: adminKey,
          review_id: review.id,
          client_id: clientId,
          client_name: clientName,
        }),
      }).then(async (res) => {
        if (res.ok) {
          console.log(`[PROGRAM] Render generation started for ${clientName}`)
        } else {
          console.error(`[PROGRAM] Render generation failed for ${clientName}: ${res.status}`)
        }
      }).catch((err) => {
        console.error(`[PROGRAM] Render call failed for ${clientName}:`, err)
      })

      // Return immediately — don't wait for generation
      // Render will update program_reviews and client_intake when done
      // and send ntfy + email notifications

      // Send ntfy that generation has started
      const ntfyTopic = process.env.NTFY_TOPIC || 'fbf-leads-bryan'
      await fetch(`https://ntfy.sh/${ntfyTopic}`, {
        method: 'POST',
        headers: {
          Title: `⏳ Program Generating: ${clientName}`,
          Priority: 'default',
          Tags: 'hourglass',
        },
        body: `AI is generating a custom program for ${clientName}.\nYou'll get another notification when it's ready for review.`,
      }).catch(() => {})

      // Email notification will be sent by Render when generation completes
      // Don't send "ready for review" here since it's still generating

      return NextResponse.json({
        success: true,
        review_id: review.id,
        status: 'generating',
        message: 'Program generation started on Render backend',
      })
    } catch (genError) {
      console.error('Program generation failed:', genError)

      // Update review with error
      await supabase
        .from('program_reviews')
        .update({
          status: 'error',
          error_message: genError instanceof Error ? genError.message : 'Unknown generation error',
        })
        .eq('id', review.id)

      // Reset intake status so it can be retried
      await supabase
        .from('client_intake')
        .update({ program_status: 'pending' })
        .eq('id', intakeId)

      // Send ntfy error notification
      const errorClientName = `${client.first_name} ${client.last_name}`
      const ntfyTopic2 = process.env.NTFY_TOPIC || 'fbf-leads-bryan'
      await fetch(`https://ntfy.sh/${ntfyTopic2}`, {
        method: 'POST',
        headers: {
          Title: `⚠️ Program Generation Failed: ${errorClientName}`,
          Priority: 'urgent',
          Tags: 'warning',
        },
        body: `Auto-program generation failed for ${errorClientName}. Error: ${genError instanceof Error ? genError.message : 'Unknown error'}\n\nGenerate manually: ${DASHBOARD_URL}/admin`,
      }).catch(() => {})

      // Still notify admin about the error via email
      for (const adminEmail of ADMIN_EMAILS) {
        try {
          await sendEmail({
            to: adminEmail,
            subject: `Program Generation FAILED: ${errorClientName}`,
            html: buildErrorEmail(errorClientName, genError instanceof Error ? genError.message : 'Unknown error'),
          })
        } catch { /* best effort */ }
      }

      return NextResponse.json({
        error: 'Program generation failed',
        details: genError instanceof Error ? genError.message : 'Unknown error',
        review_id: review.id,
      }, { status: 500 })
    }
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

function buildNotificationEmail(
  clientName: string,
  intake: IntakeData,
  reviewUrl: string
): string {
  const stats = [
    intake.current_weight_lbs ? `Weight: ${intake.current_weight_lbs} lbs` : null,
    intake.goal_weight_lbs ? `Goal: ${intake.goal_weight_lbs} lbs` : null,
    intake.height_inches ? `Height: ${Math.floor(intake.height_inches / 12)}'${intake.height_inches % 12}"` : null,
    intake.primary_goals ? `Goals: ${intake.primary_goals}` : null,
  ].filter(Boolean)

  const medicalFlags = [
    intake.medical_conditions ? `Conditions: ${intake.medical_conditions}` : null,
    intake.injuries_or_limitations ? `Injuries: ${intake.injuries_or_limitations}` : null,
    intake.current_medications ? `Medications: ${intake.current_medications}` : null,
  ].filter(Boolean)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { color: #FF6A00; font-size: 24px; font-weight: 900; letter-spacing: 3px; }
    .card { background: #141414; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
    h1 { color: #ffffff; font-size: 20px; margin: 0 0 16px 0; }
    h2 { color: #FF6A00; font-size: 14px; margin: 16px 0 8px 0; text-transform: uppercase; letter-spacing: 1px; }
    p { color: #999999; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0; }
    .stat { color: #ffffff; font-size: 13px; padding: 4px 0; }
    .medical { color: #D4A017; font-size: 13px; padding: 4px 0; }
    .btn { display: inline-block; background: #FF6A00; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; }
    .badge { display: inline-block; background: #1a3a1a; color: #4ade80; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FORGED BY FREEDOM</div>
    </div>
    <div class="card">
      <h1>New Program Ready for Review</h1>
      <p>A new AI-generated program is ready for <strong style="color:#fff">${clientName}</strong>.</p>
      <span class="badge">Pending Review</span>

      ${stats.length > 0 ? `
      <h2>Client Stats</h2>
      ${stats.map(s => `<div class="stat">${s}</div>`).join('')}
      ` : ''}

      ${medicalFlags.length > 0 ? `
      <h2>Medical Flags</h2>
      ${medicalFlags.map(f => `<div class="medical">${f}</div>`).join('')}
      ` : ''}
    </div>
    <div class="card" style="text-align: center;">
      <p style="margin-bottom: 16px; color: #ffffff;">Review, edit, and approve the program:</p>
      <a href="${reviewUrl}" class="btn">Review Program</a>
    </div>
  </div>
</body>
</html>`
}

function buildErrorEmail(clientName: string, errorMsg: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { color: #FF6A00; font-size: 24px; font-weight: 900; letter-spacing: 3px; }
    .card { background: #141414; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
    h1 { color: #ef4444; font-size: 20px; margin: 0 0 16px 0; }
    p { color: #999999; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0; }
    .error-box { background: #1a0a0a; border: 1px solid #ef4444; border-radius: 8px; padding: 12px; margin-top: 12px; }
    .error-text { color: #fca5a5; font-size: 13px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FORGED BY FREEDOM</div>
    </div>
    <div class="card">
      <h1>Program Generation Failed</h1>
      <p>Failed to auto-generate a program for <strong style="color:#fff">${clientName}</strong>.</p>
      <p>You can retry from the dashboard or create the program manually.</p>
      <div class="error-box">
        <span class="error-text">${errorMsg}</span>
      </div>
    </div>
  </div>
</body>
</html>`
}

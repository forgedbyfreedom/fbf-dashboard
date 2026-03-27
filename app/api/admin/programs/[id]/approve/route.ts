import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-check'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

const PORTAL_URL = 'https://fbf-dashboard.vercel.app/portal'

/**
 * POST /api/admin/programs/[id]/approve
 *
 * Approves a program review:
 * 1. Takes the (possibly edited) program from the review
 * 2. PATCHes the client record with all program fields
 * 3. Emails the client with their program details + login credentials
 * 4. Updates review status to 'approved'
 * 5. Updates intake status to 'program_delivered'
 *
 * Body (optional): { program?: {...overrides} }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // Verify org_admin
    const { data: membership } = await adminSupabase
      .from('org_members')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'org_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))

    // Get the review
    const { data: review, error: reviewError } = await adminSupabase
      .from('program_reviews')
      .select('*')
      .eq('id', id)
      .single()

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Program review not found' }, { status: 404 })
    }

    if (review.status === 'approved') {
      return NextResponse.json({ error: 'Program already approved' }, { status: 400 })
    }

    // Use overrides from body, or fall back to the stored generated program
    const program = body.program || review.generated_program
    if (!program) {
      return NextResponse.json({ error: 'No program data available' }, { status: 400 })
    }

    // Get client info
    const { data: client } = await adminSupabase
      .from('clients')
      .select('id, first_name, last_name, email, user_id')
      .eq('id', review.client_id)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // 1. PATCH the client record with all program fields
    const clientUpdate: Record<string, unknown> = {
      program_name: program.program_name,
      program_raw_text: program.program_raw_text,
      target_calories: program.target_calories,
      target_protein: program.target_protein,
      target_carbs: program.target_carbs,
      target_fats: program.target_fats,
      target_water_oz: program.target_water_oz,
      target_steps: program.target_steps,
      weigh_in_day: program.weigh_in_day || 'monday',
      workout_program: program.workout_program || [],
      meal_plan: program.meal_plan || [],
      cardio_protocol: program.cardio_protocol || [],
      current_supplements: program.current_supplements || [],
      current_peptides: program.current_peptides || [],
      medical_protocol: program.medical_protocol || [],
    }

    const { error: updateError } = await adminSupabase
      .from('clients')
      .update(clientUpdate)
      .eq('id', client.id)

    if (updateError) {
      return NextResponse.json({ error: `Failed to update client: ${updateError.message}` }, { status: 500 })
    }

    // 2. Update review status
    await adminSupabase
      .from('program_reviews')
      .update({
        status: 'approved',
        approved_program: program,
        approved_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)

    // 3. Update intake status
    if (review.intake_id) {
      await adminSupabase
        .from('client_intake')
        .update({ program_status: 'program_delivered' })
        .eq('id', review.intake_id)
    }

    // 4. Email the client their program
    if (client.email) {
      try {
        const clientName = `${client.first_name} ${client.last_name}`
        const hasAccount = !!client.user_id
        const emailHtml = buildProgramDeliveryEmail(clientName, program, hasAccount)

        await sendEmail({
          to: client.email,
          subject: `Your FBF Custom Program is Ready - ${client.first_name}!`,
          html: emailHtml,
        })
      } catch (emailErr) {
        console.error('Failed to email program to client:', emailErr)
        // Non-fatal — program is still approved
      }
    }

    return NextResponse.json({
      success: true,
      message: `Program approved and delivered to ${client.first_name} ${client.last_name}`,
    })
  } catch (err) {
    console.error('Approve error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

function buildProgramDeliveryEmail(
  clientName: string,
  program: Record<string, unknown>,
  hasAccount: boolean
): string {
  const targets = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0;">
      <div style="background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;padding:12px;text-align:center;">
        <div style="color:#FF6A00;font-size:20px;font-weight:700;">${program.target_calories || '—'}</div>
        <div style="color:#888;font-size:11px;text-transform:uppercase;">Calories</div>
      </div>
      <div style="background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;padding:12px;text-align:center;">
        <div style="color:#FF6A00;font-size:20px;font-weight:700;">${program.target_protein || '—'}g</div>
        <div style="color:#888;font-size:11px;text-transform:uppercase;">Protein</div>
      </div>
      <div style="background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;padding:12px;text-align:center;">
        <div style="color:#FF6A00;font-size:20px;font-weight:700;">${program.target_steps || '—'}</div>
        <div style="color:#888;font-size:11px;text-transform:uppercase;">Steps</div>
      </div>
      <div style="background:#0a0a0a;border:1px solid #2a2a2a;border-radius:8px;padding:12px;text-align:center;">
        <div style="color:#FF6A00;font-size:20px;font-weight:700;">${program.target_water_oz || '—'}oz</div>
        <div style="color:#888;font-size:11px;text-transform:uppercase;">Water</div>
      </div>
    </div>`

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
    h1 { color: #ffffff; font-size: 22px; margin: 0 0 16px 0; }
    h2 { color: #FF6A00; font-size: 14px; margin: 20px 0 8px 0; text-transform: uppercase; letter-spacing: 1px; }
    p { color: #999999; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0; }
    .highlight { color: #FF6A00; font-weight: 600; }
    .btn { display: inline-block; background: #FF6A00; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; }
    .action-item { color: #ffffff; font-size: 13px; padding: 8px 0; border-bottom: 1px solid #1a1a1a; }
    .action-item:last-child { border-bottom: none; }
    .number { color: #FF6A00; font-weight: 700; margin-right: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FORGED BY FREEDOM</div>
      <div class="tagline">Strength &bull; Discipline &bull; Freedom</div>
    </div>

    <div class="card">
      <h1>Your Custom Program is Ready!</h1>
      <p>Hey ${clientName},</p>
      <p>Your personalized <span class="highlight">${program.program_name || 'FBF Coaching Program'}</span> has been built and is loaded into your account. Here are your daily targets:</p>
      ${targets}
    </div>

    <div class="card">
      <h2>Your Action Items</h2>
      <div class="action-item"><span class="number">1.</span> Log in to the FBF Portal below to see your full program</div>
      <div class="action-item"><span class="number">2.</span> Review your workout program and meal plan</div>
      <div class="action-item"><span class="number">3.</span> Start daily check-ins — your coach is watching</div>
      <div class="action-item"><span class="number">4.</span> Hit your daily targets: calories, protein, steps, water</div>
      <div class="action-item"><span class="number">5.</span> Message your coach in the portal chat with any questions</div>
    </div>

    ${hasAccount ? `
    <div class="card" style="text-align: center;">
      <p style="margin-bottom: 16px; color: #ffffff;">Your program is live in your portal:</p>
      <a href="${PORTAL_URL}" class="btn">Log In to FBF Portal</a>
      <div style="margin-top: 16px;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(PORTAL_URL)}&bgcolor=0F0F0F&color=FF6A00&margin=0" alt="Scan to log in" width="120" height="120" style="border-radius: 8px;">
        <p style="font-size: 11px; color: #666; margin-top: 8px;">Scan to open your portal</p>
      </div>
    </div>
    ` : `
    <div class="card" style="text-align: center;">
      <p style="color: #D4A017; margin-bottom: 8px;">Your login credentials will be sent in a separate email.</p>
      <p style="color: #888; font-size: 13px;">Contact your coach if you don't receive them within 24 hours.</p>
    </div>
    `}

    <div style="text-align: center; margin-top: 32px;">
      <p style="color: #555555; font-size: 12px;">Forged by Freedom Coaching</p>
      <p style="color: #555555; font-size: 12px;">Questions? Reply directly to your coach.</p>
    </div>
    <div style="border-top: 1px solid #2a2a2a; padding: 16px 0; margin-top: 16px; text-align: center;">
      <p style="font-size: 10px; color: #666; line-height: 1.6;">This email is for informational purposes only and does not constitute medical advice. Consult a licensed physician before implementing changes.</p>
      <p style="font-size: 10px; color: #FF6A00; margin-top: 4px;">FORGED BY FREEDOM STRENGTH & NUTRITION</p>
    </div>
  </div>
</body>
</html>`
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

const PORTAL_URL = 'https://fbf-dashboard.vercel.app/portal'

function buildWelcomeEmail(name: string, email: string, password: string): string {
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
    p { color: #999999; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0; }
    .highlight { color: #FF6A00; font-weight: 600; }
    .credential-box { background: #0a0a0a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .credential-label { color: #888888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .credential-value { color: #ffffff; font-size: 15px; font-weight: 600; font-family: monospace; }
    .btn { display: inline-block; background: #FF6A00; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; }
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
    </div>
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

// GET — List all auth users with their client info
export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminSupabase = createAdminClient()

  // Verify org_admin
  const { data: membership } = await adminSupabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .single()
  if (membership?.role !== 'org_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Get all auth users
  const { data: { users }, error } = await adminSupabase.auth.admin.listUsers({ perPage: 100 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get all clients to match
  const { data: clients } = await adminSupabase.from('clients').select('id, user_id, first_name, last_name, email, is_active')

  // Merge auth users with client data
  const merged = (users || []).map(u => {
    const client = clients?.find(c => c.user_id === u.id || c.email === u.email)
    return {
      auth_id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      confirmed_at: u.email_confirmed_at,
      banned_until: u.banned_until,
      client_id: client?.id || null,
      client_name: client ? `${client.first_name} ${client.last_name}` : null,
      is_active: client?.is_active ?? null,
    }
  })

  return NextResponse.json({ users: merged })
}

// POST — Create new user, reset password, delete user, ban/unban, etc.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminSupabase = createAdminClient()

  // Verify org_admin
  const { data: membership } = await adminSupabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .single()
  if (membership?.role !== 'org_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { action, auth_id, email, password, first_name, last_name, ban_duration } = body

  try {
    switch (action) {
      case 'create_user': {
        // Create auth user
        const { data: newUser, error } = await adminSupabase.auth.admin.createUser({
          email,
          password: password || 'DISCIPLINE',
          email_confirm: true,
          user_metadata: { full_name: `${first_name || ''} ${last_name || ''}`.trim() }
        })
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })

        // Create client record
        const { data: org } = await adminSupabase
          .from('org_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .single()

        if (org) {
          await adminSupabase.from('clients').insert({
            user_id: newUser.user.id,
            organization_id: org.organization_id,
            first_name: first_name || '',
            last_name: last_name || '',
            email,
            is_active: true,
          })

          // Create org membership for the new user
          await adminSupabase.from('org_members').insert({
            user_id: newUser.user.id,
            organization_id: org.organization_id,
            role: 'client',
          })

          // Create coach assignment
          await adminSupabase.from('client_coach_assignments').insert({
            client_id: newUser.user.id,
            coach_user_id: user.id,
            is_active: true,
          })
        }

        // Send welcome email with credentials
        const tempPassword = password || 'DISCIPLINE'
        const clientName = `${first_name || ''} ${last_name || ''}`.trim()
        try {
          await sendEmail({
            to: email,
            subject: 'Welcome to Forged by Freedom — Your Login Credentials',
            html: buildWelcomeEmail(clientName, email, tempPassword),
          })
        } catch (emailErr) {
          console.error('Failed to send welcome email:', emailErr)
          // Don't fail the user creation if email fails
        }

        return NextResponse.json({ success: true, user_id: newUser.user.id })
      }

      case 'reset_password': {
        const { error } = await adminSupabase.auth.admin.updateUserById(auth_id, { password })
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        return NextResponse.json({ success: true })
      }

      case 'update_email': {
        const { error } = await adminSupabase.auth.admin.updateUserById(auth_id, { email })
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        // Also update client record
        await adminSupabase.from('clients').update({ email }).eq('user_id', auth_id)
        return NextResponse.json({ success: true })
      }

      case 'delete_user': {
        // Delete ALL related records first (order matters for foreign keys)
        const { data: clientRecords } = await adminSupabase.from('clients').select('id').eq('user_id', auth_id)
        const clientIds = (clientRecords || []).map(c => c.id)

        const deleteTables = [
          'client_badges', 'client_streaks', 'client_metrics', 'client_coach_assignments',
          'scheduled_checkins', 'coach_notes', 'client_reports', 'client_links',
          'sms_messages', 'push_tokens', 'wearable_data', 'flags', 'checkins',
        ]
        for (const cid of clientIds) {
          for (const table of deleteTables) {
            try { await adminSupabase.from(table).delete().eq('client_id', cid) } catch { /* ignore */ }
          }
          try { await adminSupabase.from('clients').delete().eq('id', cid) } catch { /* ignore */ }
        }

        // Also delete by user_id for tables that reference auth user directly
        for (const table of ['chat_members', 'chat_messages', 'org_members']) {
          try { await adminSupabase.from(table).delete().eq('user_id', auth_id) } catch { /* ignore */ }
        }
        try { await adminSupabase.from('profiles').delete().eq('id', auth_id) } catch { /* ignore */ }

        // Finally delete auth user
        const { error } = await adminSupabase.auth.admin.deleteUser(auth_id)
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        return NextResponse.json({ success: true })
      }

      case 'ban_user': {
        const { error } = await adminSupabase.auth.admin.updateUserById(auth_id, {
          ban_duration: ban_duration || '876000h' // ~100 years = permanent
        })
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        return NextResponse.json({ success: true })
      }

      case 'unban_user': {
        const { error } = await adminSupabase.auth.admin.updateUserById(auth_id, { ban_duration: 'none' })
        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        return NextResponse.json({ success: true })
      }

      case 'toggle_active': {
        const { data: client } = await adminSupabase.from('clients').select('id, is_active').eq('user_id', auth_id).single()
        if (client) {
          await adminSupabase.from('clients').update({ is_active: !client.is_active }).eq('id', client.id)
        }
        return NextResponse.json({ success: true, is_active: client ? !client.is_active : null })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

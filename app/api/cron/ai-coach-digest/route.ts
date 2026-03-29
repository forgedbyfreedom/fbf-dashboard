import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

const ADMIN_EMAILS = ['forgedbyfreedom@proton.me', 'wantonelli2@comcast.net']

/**
 * GET /api/cron/ai-coach-digest
 *
 * Nightly digest of all AI Coach questions asked today.
 * Runs at 10 PM ET via Vercel cron.
 * Sends email + ntfy to Bryan with grouped questions by client.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron
    const isVercelCron = request.headers.get('x-vercel-cron') === '1'
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get today's date range (ET timezone)
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    // Query AI coach conversations from today
    // These are stored in the conversations table on Supabase (via Render backend)
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, sender_id, sender_name, message, direction, channel, lead_id, created_at')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Digest query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!conversations || conversations.length === 0) {
      // No conversations today — send a quiet "all clear"
      const ntfyTopic = process.env.NTFY_TOPIC || 'fbf-leads-bryan'
      await fetch(`https://ntfy.sh/${ntfyTopic}`, {
        method: 'POST',
        headers: { Title: '📊 AI Coach Digest: No activity today', Priority: 'low', Tags: 'chart_with_downwards_trend' },
        body: 'No AI Coach questions were asked today.',
      }).catch(() => {})

      return NextResponse.json({ message: 'No conversations today', sent: 0 })
    }

    // Group conversations by sender
    const grouped: Record<string, Array<{ message: string; direction: string; created_at: string; channel: string }>> = {}
    for (const conv of conversations) {
      const key = conv.sender_name || conv.sender_id || 'Unknown'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push({
        message: conv.message,
        direction: conv.direction,
        created_at: conv.created_at,
        channel: conv.channel || 'app',
      })
    }

    // Count unique users and total questions
    const uniqueUsers = Object.keys(grouped).length
    const inboundMessages = conversations.filter(c => c.direction === 'inbound').length
    const outboundMessages = conversations.filter(c => c.direction === 'outbound').length

    // Build email HTML
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })

    let clientSections = ''
    for (const [name, msgs] of Object.entries(grouped)) {
      const questions = msgs.filter(m => m.direction === 'inbound')
      if (questions.length === 0) continue

      clientSections += `
        <div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:20px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div style="font-size:16px;font-weight:700;color:#fff;">${name}</div>
            <div style="font-size:12px;color:#888;">${questions.length} question${questions.length > 1 ? 's' : ''}</div>
          </div>`

      for (const q of questions) {
        const time = new Date(q.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
        const truncated = q.message.length > 200 ? q.message.substring(0, 200) + '...' : q.message

        // Find the AI response (next outbound after this inbound)
        const qIndex = msgs.indexOf(q)
        const response = msgs.slice(qIndex + 1).find(m => m.direction === 'outbound')
        const responsePreview = response
          ? (response.message.length > 150 ? response.message.substring(0, 150) + '...' : response.message)
          : null

        clientSections += `
          <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #1a1a1a;">
            <div style="font-size:11px;color:#FF6A00;font-weight:600;margin-bottom:4px;">${time} via ${q.channel}</div>
            <div style="font-size:14px;color:#fff;line-height:1.5;margin-bottom:6px;">${truncated}</div>
            ${responsePreview ? `<div style="font-size:12px;color:#888;line-height:1.4;background:#0a0a0a;padding:8px 12px;border-radius:8px;border-left:3px solid #FF6A00;">AI: ${responsePreview}</div>` : ''}
          </div>`
      }

      clientSections += '</div>'
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:700px;margin:0 auto;padding:40px 20px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="color:#FF6A00;font-size:24px;font-weight:900;letter-spacing:3px;">FORGED BY FREEDOM</div>
    <div style="color:#888;font-size:13px;margin-top:4px;">AI Coach Daily Digest</div>
  </div>

  <div style="background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
    <div style="color:#888;font-size:13px;margin-bottom:8px;">${dateStr}</div>
    <div style="display:flex;justify-content:center;gap:40px;">
      <div>
        <div style="font-size:36px;font-weight:900;color:#FF6A00;">${uniqueUsers}</div>
        <div style="font-size:11px;color:#888;">Unique Users</div>
      </div>
      <div>
        <div style="font-size:36px;font-weight:900;color:#FF6A00;">${inboundMessages}</div>
        <div style="font-size:11px;color:#888;">Questions Asked</div>
      </div>
      <div>
        <div style="font-size:36px;font-weight:900;color:#FF6A00;">${outboundMessages}</div>
        <div style="font-size:11px;color:#888;">AI Responses</div>
      </div>
    </div>
  </div>

  ${clientSections}

  <div style="text-align:center;padding-top:20px;border-top:1px solid #2a2a2a;color:#555;font-size:11px;">
    <p>FBF AI Coach Nightly Digest — Auto-generated</p>
  </div>
</div>
</body>
</html>`

    // Send to admins
    for (const email of ADMIN_EMAILS) {
      try {
        await sendEmail({
          to: email,
          subject: `AI Coach Digest: ${inboundMessages} questions from ${uniqueUsers} users — ${dateStr}`,
          html: emailHtml,
        })
      } catch (emailErr) {
        console.error(`Digest email failed for ${email}:`, emailErr)
      }
    }

    // ntfy summary
    const ntfyTopic = process.env.NTFY_TOPIC || 'fbf-leads-bryan'
    const topQuestions = conversations
      .filter(c => c.direction === 'inbound')
      .slice(0, 3)
      .map(c => `• ${c.sender_name || 'Unknown'}: "${c.message.substring(0, 60)}..."`)
      .join('\n')

    await fetch(`https://ntfy.sh/${ntfyTopic}`, {
      method: 'POST',
      headers: {
        Title: `📊 AI Coach Digest: ${inboundMessages} questions from ${uniqueUsers} users`,
        Priority: 'default',
        Tags: 'bar_chart,brain',
      },
      body: `${dateStr}\n\nTop questions:\n${topQuestions}\n\nFull digest sent to email.`,
    }).catch(() => {})

    return NextResponse.json({
      message: `Digest sent: ${inboundMessages} questions from ${uniqueUsers} users`,
      unique_users: uniqueUsers,
      questions: inboundMessages,
      responses: outboundMessages,
    })
  } catch (err) {
    console.error('AI Coach digest error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

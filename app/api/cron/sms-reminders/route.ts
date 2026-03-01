import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSMS, getTwilioPhoneNumber, isTwilioConfigured } from '@/lib/twilio'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isTwilioConfigured()) {
    return NextResponse.json({ message: 'Twilio not configured', sent: 0 })
  }

  const adminSupabase = createAdminClient()

  // Find tomorrow's scheduled check-ins that haven't been completed
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const { data: checkins } = await adminSupabase
    .from('scheduled_checkins')
    .select('*, clients(id, first_name, last_name, phone, sms_opt_in)')
    .eq('scheduled_for', tomorrowStr)
    .is('completed_at', null)

  if (!checkins || checkins.length === 0) {
    return NextResponse.json({ message: 'No reminders to send', sent: 0 })
  }

  const results = []

  for (const checkin of checkins) {
    const client = checkin.clients as unknown as {
      id: string; first_name: string; last_name: string; phone: string | null; sms_opt_in: boolean
    }

    if (!client?.phone || !client.sms_opt_in) continue

    const typeLabel = checkin.type === 'monthly_facetime' ? 'Facetime call' : 'Email check-in'
    const timeStr = checkin.scheduled_time
      ? ` at ${new Date(`2000-01-01T${checkin.scheduled_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
      : ''

    const message = `Hey ${client.first_name}! Reminder: You have a ${typeLabel} scheduled for tomorrow${timeStr} with your coach. 💪 Reply "done" after to mark it complete!`

    try {
      const result = await sendSMS({ to: client.phone, body: message })

      // Log the outbound reminder
      await adminSupabase.from('sms_messages').insert({
        client_id: client.id,
        coach_user_id: checkin.coach_user_id,
        direction: 'outbound',
        from_number: getTwilioPhoneNumber(),
        to_number: client.phone,
        body: message,
        message_type: 'reminder',
        twilio_sid: result.sid,
      })

      results.push({ client: client.first_name, status: 'sent' })
    } catch (err) {
      console.error(`SMS reminder failed for ${client.first_name}:`, err)
      results.push({ client: client.first_name, status: 'failed' })
    }
  }

  return NextResponse.json({ message: 'Reminders processed', sent: results.filter(r => r.status === 'sent').length, results })
}

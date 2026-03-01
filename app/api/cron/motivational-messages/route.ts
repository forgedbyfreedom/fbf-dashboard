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

  // Get a random active motivational message
  const { data: messages } = await adminSupabase
    .from('motivational_messages')
    .select('id, message, category')
    .eq('is_active', true)

  if (!messages || messages.length === 0) {
    return NextResponse.json({ message: 'No motivational messages available', sent: 0 })
  }

  const randomMessage = messages[Math.floor(Math.random() * messages.length)]

  // Get all active clients with SMS opt-in and phone numbers
  const { data: clients } = await adminSupabase
    .from('clients')
    .select('id, first_name, phone')
    .eq('is_active', true)
    .eq('sms_opt_in', true)
    .not('phone', 'is', null)

  if (!clients || clients.length === 0) {
    return NextResponse.json({ message: 'No opted-in clients', sent: 0 })
  }

  // Find coach for each client (for logging)
  const { data: assignments } = await adminSupabase
    .from('client_coach_assignments')
    .select('client_id, coach_user_id')

  const coachMap = new Map(
    (assignments || []).map(a => [a.client_id, a.coach_user_id])
  )

  const results = []

  for (const client of clients) {
    const smsBody = `${randomMessage.message}\n\n— Forged By Freedom 🔥`

    try {
      const result = await sendSMS({ to: client.phone!, body: smsBody })

      await adminSupabase.from('sms_messages').insert({
        client_id: client.id,
        coach_user_id: coachMap.get(client.id) || null,
        direction: 'outbound',
        from_number: getTwilioPhoneNumber(),
        to_number: client.phone!,
        body: smsBody,
        message_type: 'motivational',
        twilio_sid: result.sid,
      })

      results.push({ client: client.first_name, status: 'sent' })
    } catch (err) {
      console.error(`Motivational SMS failed for ${client.first_name}:`, err)
      results.push({ client: client.first_name, status: 'failed' })
    }
  }

  return NextResponse.json({
    message: `Motivational message sent: "${randomMessage.message}" (${randomMessage.category})`,
    sent: results.filter(r => r.status === 'sent').length,
    results,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSMS, getTwilioPhoneNumber, isTwilioConfigured } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  try {
    if (!isTwilioConfigured()) {
      return NextResponse.json({ error: 'SMS is not configured' }, { status: 503 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { client_id, message } = body

    if (!client_id || !message) {
      return NextResponse.json({ error: 'client_id and message are required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Get client phone
    const { data: client } = await adminSupabase
      .from('clients')
      .select('id, first_name, last_name, phone, sms_opt_in')
      .eq('id', client_id)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    if (!client.phone) {
      return NextResponse.json({ error: 'Client has no phone number' }, { status: 400 })
    }

    // Send SMS
    const result = await sendSMS({ to: client.phone, body: message })

    // Log outbound message
    await adminSupabase.from('sms_messages').insert({
      client_id: client.id,
      coach_user_id: user.id,
      direction: 'outbound',
      from_number: getTwilioPhoneNumber(),
      to_number: client.phone,
      body: message,
      message_type: 'chat',
      twilio_sid: result.sid,
    })

    return NextResponse.json({ success: true, sid: result.sid })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send SMS'
    console.error('SMS send error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

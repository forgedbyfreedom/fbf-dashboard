import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSMS, getTwilioPhoneNumber } from '@/lib/twilio'

// Parse check-in data from free-form text
// Supports: "Weight: 205, Sleep: 7, Mood: 8" or "w205 s7 m8" or mixed
function parseCheckinData(text: string): Record<string, number> | null {
  const data: Record<string, number> = {}
  const lower = text.toLowerCase().trim()

  // Pattern: "weight: 205" or "w: 205" or "w205" or "weight 205"
  const patterns: [RegExp, string][] = [
    [/(?:weight|wt|w)[:\s]*(\d+\.?\d*)/i, 'weight_lbs'],
    [/(?:sleep|sl|s)[:\s]*(\d+\.?\d*)/i, 'sleep_hours'],
    [/(?:mood|mo)[:\s]*(\d+)/i, 'mood_rating'],
    [/(?:stress|st)[:\s]*(\d+)/i, 'stress_level'],
    [/(?:calories|cal|c)[:\s]*(\d+)/i, 'calories'],
    [/(?:protein|pro|p)[:\s]*(\d+)/i, 'protein_g'],
    [/(?:steps)[:\s]*(\d+)/i, 'steps'],
    [/(?:water|h2o)[:\s]*(\d+)/i, 'water_oz'],
    [/(?:cardio|card)[:\s]*(\d+)/i, 'cardio_minutes'],
  ]

  for (const [regex, field] of patterns) {
    const match = lower.match(regex)
    if (match) {
      data[field] = parseFloat(match[1])
    }
  }

  return Object.keys(data).length > 0 ? data : null
}

// Check if message is a "done" / completion reply
function isDoneReply(text: string): boolean {
  const lower = text.toLowerCase().trim()
  return ['done', 'completed', 'yes', 'complete', 'finished', 'did it', '✅', '👍'].includes(lower)
}

export async function POST(request: NextRequest) {
  try {
    // Twilio sends form-encoded data
    const formData = await request.formData()
    const from = formData.get('From') as string
    const body = formData.get('Body') as string
    const twilioSid = formData.get('MessageSid') as string

    if (!from || !body) {
      return new NextResponse('<Response><Message>Invalid request</Message></Response>', {
        status: 400,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    const adminSupabase = createAdminClient()

    // Normalize phone number (strip +1 prefix for matching, keep raw for storage)
    const normalizedPhone = from.replace(/^\+1/, '').replace(/\D/g, '')

    // Find client by phone number
    const { data: client } = await adminSupabase
      .from('clients')
      .select('id, first_name, last_name, phone, sms_opt_in, organization_id')
      .or(`phone.eq.${from},phone.eq.${normalizedPhone},phone.eq.+1${normalizedPhone}`)
      .single()

    if (!client) {
      return twimlResponse('Thanks for reaching out! Your number isn\'t linked to a coaching account yet. Please contact your coach to get set up.')
    }

    if (!client.sms_opt_in) {
      // Auto opt-in if they text first, since they initiated
      await adminSupabase
        .from('clients')
        .update({ sms_opt_in: true })
        .eq('id', client.id)
    }

    // Find the coach assigned to this client
    const { data: assignment } = await adminSupabase
      .from('client_coach_assignments')
      .select('coach_user_id')
      .eq('client_id', client.id)
      .single()

    const coachUserId = assignment?.coach_user_id || null

    // Log inbound message
    await adminSupabase.from('sms_messages').insert({
      client_id: client.id,
      coach_user_id: coachUserId,
      direction: 'inbound',
      from_number: from,
      to_number: getTwilioPhoneNumber(),
      body,
      message_type: 'unknown', // will update below
      twilio_sid: twilioSid,
    })

    // Route the message
    const trimmed = body.trim()

    // 1. Check for "done" / completion reply
    if (isDoneReply(trimmed)) {
      return await handleDoneReply(adminSupabase, client, coachUserId, from, twilioSid)
    }

    // 2. Check for check-in data
    const checkinData = parseCheckinData(trimmed)
    if (checkinData) {
      return await handleCheckinData(adminSupabase, client, coachUserId, checkinData, from, twilioSid)
    }

    // 3. Otherwise treat as chat message to coach
    return await handleChatMessage(adminSupabase, client, coachUserId, trimmed, from, twilioSid)

  } catch (err) {
    console.error('Twilio webhook error:', err)
    return twimlResponse('Sorry, something went wrong. Please try again later.')
  }
}

async function handleDoneReply(
  supabase: ReturnType<typeof createAdminClient>,
  client: { id: string; first_name: string },
  coachUserId: string | null,
  from: string,
  twilioSid: string
) {
  // Find the next upcoming uncompleted scheduled check-in for this client
  const today = new Date().toISOString().split('T')[0]
  const { data: nextCheckin } = await supabase
    .from('scheduled_checkins')
    .select('id, type, scheduled_for')
    .eq('client_id', client.id)
    .is('completed_at', null)
    .lte('scheduled_for', today)
    .order('scheduled_for', { ascending: true })
    .limit(1)
    .single()

  if (nextCheckin) {
    await supabase
      .from('scheduled_checkins')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', nextCheckin.id)

    // Update message type
    await supabase
      .from('sms_messages')
      .update({ message_type: 'status_reply' })
      .eq('twilio_sid', twilioSid)

    const typeLabel = nextCheckin.type === 'monthly_facetime' ? 'Facetime' : 'Email'
    return twimlResponse(`Got it ${client.first_name}! Your ${typeLabel} check-in for ${nextCheckin.scheduled_for} has been marked complete. Keep crushing it! 💪`)
  }

  return twimlResponse(`Thanks ${client.first_name}! No pending check-ins found to mark complete. Text your coach anytime!`)
}

async function handleCheckinData(
  supabase: ReturnType<typeof createAdminClient>,
  client: { id: string; first_name: string },
  coachUserId: string | null,
  data: Record<string, number>,
  from: string,
  twilioSid: string
) {
  const today = new Date().toISOString().split('T')[0]

  // Upsert checkin for today
  const checkinPayload: Record<string, unknown> = {
    client_id: client.id,
    date: today,
    ...data,
  }

  const { error } = await supabase
    .from('checkins')
    .upsert(checkinPayload, { onConflict: 'client_id,date' })

  if (error) {
    console.error('SMS checkin upsert error:', error)
    return twimlResponse('Sorry, had trouble saving your check-in. Please try again.')
  }

  // Update message type
  await supabase
    .from('sms_messages')
    .update({ message_type: 'checkin' })
    .eq('twilio_sid', twilioSid)

  // Build confirmation
  const fields = Object.entries(data)
    .map(([k, v]) => {
      const labels: Record<string, string> = {
        weight_lbs: 'Weight', sleep_hours: 'Sleep', mood_rating: 'Mood',
        stress_level: 'Stress', calories: 'Calories', protein_g: 'Protein',
        steps: 'Steps', water_oz: 'Water', cardio_minutes: 'Cardio',
      }
      return `${labels[k] || k}: ${v}`
    })
    .join(', ')

  return twimlResponse(`Check-in logged for ${client.first_name}! ${fields}. Keep it up! 🔥`)
}

async function handleChatMessage(
  supabase: ReturnType<typeof createAdminClient>,
  client: { id: string; first_name: string; last_name: string },
  coachUserId: string | null,
  message: string,
  from: string,
  twilioSid: string
) {
  // Update message type
  await supabase
    .from('sms_messages')
    .update({ message_type: 'chat' })
    .eq('twilio_sid', twilioSid)

  // If coach exists, also create a coach note so they see it
  if (coachUserId) {
    await supabase.from('coach_notes').insert({
      client_id: client.id,
      coach_user_id: coachUserId,
      note: `[SMS from ${client.first_name}]: ${message}`,
      action_items: [],
    })
  }

  return twimlResponse(`Thanks ${client.first_name}! Your message has been forwarded to your coach. They'll get back to you soon.`)
}

function twimlResponse(message: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

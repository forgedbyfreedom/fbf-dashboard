import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminSupabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Get all active clients
  const { data: clients } = await adminSupabase
    .from('clients')
    .select('id, first_name')
    .eq('is_active', true)

  if (!clients || clients.length === 0) {
    return NextResponse.json({ message: 'No active clients', sent: 0 })
  }

  // Get today's check-ins
  const { data: checkins } = await adminSupabase
    .from('checkins')
    .select('client_id')
    .eq('date', today)

  const checkedInIds = new Set((checkins || []).map(c => c.client_id))

  // Filter to clients who haven't checked in
  const missedClients = clients.filter(c => !checkedInIds.has(c.id))

  if (missedClients.length === 0) {
    return NextResponse.json({ message: 'All clients checked in', sent: 0 })
  }

  // Get push tokens for missed clients
  const { data: tokens } = await adminSupabase
    .from('push_tokens')
    .select('client_id, token')
    .in('client_id', missedClients.map(c => c.id))
    .eq('is_active', true)

  if (!tokens || tokens.length === 0) {
    return NextResponse.json({ message: 'No push tokens for missed clients', sent: 0 })
  }

  // Group tokens by client
  const clientTokenMap = new Map<string, string[]>()
  for (const t of tokens) {
    if (!t.client_id) continue
    const existing = clientTokenMap.get(t.client_id) || []
    existing.push(t.token)
    clientTokenMap.set(t.client_id, existing)
  }

  // Build push messages
  const messages = []
  for (const client of missedClients) {
    const clientTokens = clientTokenMap.get(client.id)
    if (!clientTokens) continue

    for (const token of clientTokens) {
      messages.push({
        to: token,
        title: 'Daily Check-in Reminder',
        body: `Hey ${client.first_name}, don't forget to log your daily check-in! Your coach is counting on you.`,
        data: { type: 'checkin_reminder' },
        sound: 'default' as const,
      })
    }
  }

  if (messages.length === 0) {
    return NextResponse.json({ message: 'No messages to send', sent: 0 })
  }

  // Send via Expo Push API
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(messages),
  })

  const result = await response.json()

  return NextResponse.json({
    message: `Sent ${messages.length} push reminders`,
    sent: messages.length,
    missedClients: missedClients.length,
    result,
  })
}

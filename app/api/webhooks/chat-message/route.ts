import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface ExpoPushMessage {
  to: string
  title?: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default' | null
}

async function sendExpoPush(messages: ExpoPushMessage[]) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(messages),
  })
  return response.json()
}

/**
 * POST /api/webhooks/chat-message
 *
 * Called when a new chat message is sent. Sends push notification
 * to all OTHER members of the channel (not the sender).
 *
 * Body: { channel_id, sender_id, content, sender_name? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { channel_id, sender_id, content, sender_name } = body

    if (!channel_id || !sender_id) {
      return NextResponse.json({ error: 'channel_id and sender_id required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get all members of this channel EXCEPT the sender
    const { data: members } = await supabase
      .from('chat_members')
      .select('user_id')
      .eq('channel_id', channel_id)
      .neq('user_id', sender_id)

    if (!members || members.length === 0) {
      return NextResponse.json({ message: 'No other members', sent: 0 })
    }

    // For each member, check if they have chat notifications enabled and get their push tokens
    const messages: ExpoPushMessage[] = []

    for (const member of members) {
      // Check if this user has notifications disabled
      const { data: client } = await supabase
        .from('clients')
        .select('id, first_name, chat_notifications')
        .eq('user_id', member.user_id)
        .single()

      // Skip if notifications explicitly disabled (default is ON)
      if (client?.chat_notifications === false) continue

      // Get push tokens — try by user_id first, then by client_id
      let tokens: Array<{ token: string }> = []

      const { data: userTokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', member.user_id)
        .eq('is_active', true)

      if (userTokens?.length) {
        tokens = userTokens
      } else if (client?.id) {
        // Try by client_id
        const { data: clientTokens } = await supabase
          .from('push_tokens')
          .select('token')
          .eq('client_id', client.id)
          .eq('is_active', true)

        if (clientTokens?.length) tokens = clientTokens
      }

      // Also check org_members for coaches
      if (!tokens.length) {
        const { data: coachTokens } = await supabase
          .from('push_tokens')
          .select('token')
          .eq('user_id', member.user_id)
          .eq('is_active', true)

        if (coachTokens?.length) tokens = coachTokens
      }

      for (const t of tokens) {
        messages.push({
          to: t.token,
          title: sender_name ? `${sender_name}` : 'New Message',
          body: content ? (content.length > 100 ? content.substring(0, 100) + '...' : content) : 'Sent an attachment',
          data: { type: 'chat_message', channel_id },
          sound: 'default',
        })
      }
    }

    if (messages.length === 0) {
      return NextResponse.json({ message: 'No tokens to notify', sent: 0 })
    }

    const result = await sendExpoPush(messages)

    return NextResponse.json({ sent: messages.length, result })
  } catch (err) {
    console.error('Chat notification error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

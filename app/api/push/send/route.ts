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

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { client_id, title, body, data } = await request.json()

    if (!client_id || !body) {
      return NextResponse.json({ error: 'client_id and body required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Get active push tokens for the client
    const { data: tokens } = await adminSupabase
      .from('push_tokens')
      .select('token')
      .eq('client_id', client_id)
      .eq('is_active', true)

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ message: 'No active tokens', sent: 0 })
    }

    const messages: ExpoPushMessage[] = tokens.map(t => ({
      to: t.token,
      title: title || 'Forged by Freedom',
      body,
      data: data || {},
      sound: 'default' as const,
    }))

    const result = await sendExpoPush(messages)

    // Deactivate any invalid tokens
    if (result.data) {
      for (let i = 0; i < result.data.length; i++) {
        if (result.data[i].status === 'error' &&
            result.data[i].details?.error === 'DeviceNotRegistered') {
          await adminSupabase
            .from('push_tokens')
            .update({ is_active: false })
            .eq('token', tokens[i].token)
        }
      }
    }

    return NextResponse.json({
      sent: tokens.length,
      result,
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET

type WebhookEvent = 'checkin.created' | 'client.created' | 'flag.red'

interface WebhookPayload {
  event: WebhookEvent
  data: Record<string, unknown>
  timestamp: string
}

export async function triggerN8nWebhook(event: WebhookEvent, data: Record<string, unknown>) {
  if (!N8N_WEBHOOK_URL) {
    console.warn('N8N_WEBHOOK_URL not configured, skipping webhook')
    return
  }

  const payload: WebhookPayload = {
    event,
    data,
    timestamp: new Date().toISOString(),
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(N8N_WEBHOOK_SECRET && { 'X-Webhook-Secret': N8N_WEBHOOK_SECRET }),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error(`n8n webhook failed: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error('n8n webhook error:', error)
  }
}

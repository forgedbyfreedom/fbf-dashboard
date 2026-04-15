const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

interface Message {
  role: 'user' | 'assistant'
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}

async function anthropicRequest(
  system: string,
  messages: Message[],
  model: string,
  temperature: number,
  max_tokens: number
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, system, messages, temperature, max_tokens }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API error (${res.status}): ${err}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text || ''
}

export async function chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  return anthropicRequest(
    systemPrompt,
    [{ role: 'user', content: userPrompt }],
    'claude-haiku-4-5-20251001',
    options?.temperature ?? 0.7,
    options?.max_tokens ?? 2048
  )
}

export async function visionCompletion(
  systemPrompt: string,
  userPrompt: string,
  imageUrl: string,
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  return anthropicRequest(
    systemPrompt,
    [
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    'claude-sonnet-4-6',
    options?.temperature ?? 0.3,
    options?.max_tokens ?? 4096
  )
}

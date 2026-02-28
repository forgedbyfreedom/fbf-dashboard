const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}

interface CompletionOptions {
  messages: Message[]
  model?: string
  temperature?: number
  max_tokens?: number
}

async function openRouterRequest(options: CompletionOptions): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }

  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://forgedbyfreedom.org',
      'X-Title': 'Forged by Freedom Dashboard',
    },
    body: JSON.stringify({
      model: options.model || 'nousresearch/hermes-3-llama-3.1-70b',
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2048,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter API error (${res.status}): ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

export async function chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  return openRouterRequest({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: 'nousresearch/hermes-3-llama-3.1-70b',
    temperature: options?.temperature,
    max_tokens: options?.max_tokens,
  })
}

export async function visionCompletion(
  systemPrompt: string,
  userPrompt: string,
  imageUrl: string,
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  return openRouterRequest({
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    model: 'google/gemini-flash-1.5',
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.max_tokens ?? 4096,
  })
}

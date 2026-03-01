const IG_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN!
const IG_USER_ID = process.env.INSTAGRAM_USER_ID!
const IG_PAGE_ID = process.env.FACEBOOK_PAGE_ID!
const GRAPH_API = 'https://graph.facebook.com/v21.0'

export function isInstagramConfigured(): boolean {
  return !!(
    process.env.INSTAGRAM_ACCESS_TOKEN &&
    process.env.INSTAGRAM_USER_ID
  )
}

// --- Content Publishing ---

interface PublishImageOptions {
  imageUrl: string
  caption: string
}

interface PublishCarouselOptions {
  imageUrls: string[]
  caption: string
}

export async function publishImage({ imageUrl, caption }: PublishImageOptions): Promise<{ id: string }> {
  // Step 1: Create media container
  const containerRes = await graphPost(`/${IG_USER_ID}/media`, {
    image_url: imageUrl,
    caption,
  })

  // Step 2: Publish the container
  const publishRes = await graphPost(`/${IG_USER_ID}/media_publish`, {
    creation_id: containerRes.id,
  })

  return { id: publishRes.id }
}

export async function publishCarousel({ imageUrls, caption }: PublishCarouselOptions): Promise<{ id: string }> {
  // Step 1: Create individual media containers
  const containerIds = []
  for (const url of imageUrls) {
    const res = await graphPost(`/${IG_USER_ID}/media`, {
      image_url: url,
      is_carousel_item: 'true',
    })
    containerIds.push(res.id)
  }

  // Step 2: Create carousel container
  const carouselRes = await graphPost(`/${IG_USER_ID}/media`, {
    media_type: 'CAROUSEL',
    children: containerIds.join(','),
    caption,
  })

  // Step 3: Publish
  const publishRes = await graphPost(`/${IG_USER_ID}/media_publish`, {
    creation_id: carouselRes.id,
  })

  return { id: publishRes.id }
}

// --- Messaging (DMs) ---

export async function sendInstagramDM(recipientId: string, message: string): Promise<{ message_id: string }> {
  const res = await graphPost(`/${IG_PAGE_ID || IG_USER_ID}/messages`, {
    recipient: JSON.stringify({ id: recipientId }),
    message: JSON.stringify({ text: message }),
    messaging_type: 'RESPONSE',
  })
  return { message_id: res.message_id }
}

// --- Helpers ---

async function graphPost(endpoint: string, params: Record<string, string>): Promise<Record<string, string>> {
  const url = `${GRAPH_API}${endpoint}`

  const body = new URLSearchParams({
    ...params,
    access_token: IG_ACCESS_TOKEN,
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const data = await res.json()

  if (data.error) {
    throw new Error(`Instagram API error: ${data.error.message} (code: ${data.error.code})`)
  }

  return data
}

export async function graphGet(endpoint: string, params: Record<string, string> = {}): Promise<Record<string, unknown>> {
  const searchParams = new URLSearchParams({
    ...params,
    access_token: IG_ACCESS_TOKEN,
  })

  const res = await fetch(`${GRAPH_API}${endpoint}?${searchParams.toString()}`)
  const data = await res.json()

  if (data.error) {
    throw new Error(`Instagram API error: ${data.error.message}`)
  }

  return data
}

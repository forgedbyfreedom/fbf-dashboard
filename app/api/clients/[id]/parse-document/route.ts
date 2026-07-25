import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, authorizeClientAccess } from '@/lib/auth-check'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

export const runtime = 'nodejs'
export const maxDuration = 120

const PROGRAM_SYSTEM_PROMPT = `You are a fitness program parser for Forged by Freedom coaching. Extract structured data from workout/nutrition documents.

Return ONLY valid JSON with this exact structure (omit empty arrays, use null for missing values):
{
  "programName": "string or null",
  "targetCalories": number or null,
  "targetProtein": number or null,
  "targetCarbs": number or null,
  "targetFats": number or null,
  "targetWaterOz": number or null,
  "workoutProgram": [{"day": "Day 1 - Chest", "exercises": [{"name": "Bench Press", "sets": "4", "reps": "8-10"}]}],
  "cardioProtocol": [{"phase": "Phase 1", "duration": "30 min", "frequency": "4x/week", "notes": ""}],
  "mealPlan": [{"meal": "Meal 1", "description": "8oz chicken, 1 cup rice"}],
  "supplements": [{"name": "Creatine", "dose": "5g", "frequency": "daily"}],
  "medicalProtocol": [{"name": "Retatrutide", "dose": "2mg", "frequency": "weekly", "notes": ""}]
}

Parse every exercise, meal, supplement, and protocol item you can find. Be thorough.`

const BODY_SCAN_SYSTEM_PROMPT = `You are a body composition scan analyzer for Forged by Freedom coaching. Extract ALL measurable data from this body composition scan (InBody, DEXA, BodPod, or similar).

Return ONLY valid JSON with this structure:
{
  "scan_type": "inbody|dexa|bodpod|calipers|bf_scale|other",
  "body_fat_pct": number or null,
  "lean_mass_lbs": number or null,
  "fat_mass_lbs": number or null,
  "total_weight_lbs": number or null,
  "skeletal_muscle_mass_lbs": number or null,
  "body_water_lbs": number or null,
  "bmi": number or null,
  "visceral_fat_level": number or null,
  "basal_metabolic_rate": number or null,
  "right_arm_lbs": number or null,
  "left_arm_lbs": number or null,
  "trunk_lbs": number or null,
  "right_leg_lbs": number or null,
  "left_leg_lbs": number or null,
  "percent_body_water": number or null,
  "ecw_ratio": number or null,
  "inbody_score": number or null
}

Convert kg to lbs (multiply by 2.205). Convert percentages to decimal numbers. Extract every value visible on the scan.`

const BLOODWORK_SYSTEM_PROMPT = `You are a bloodwork/lab report analyzer for Forged by Freedom coaching. Extract EVERY lab marker from this report.

Return ONLY valid JSON array:
[
  {
    "marker": "Testosterone Total",
    "value": 856,
    "unit": "ng/dL",
    "reference_low": 264,
    "reference_high": 916,
    "status": "normal|high|low|critical",
    "flag": true or false
  }
]

Extract every marker including: CBC, CMP, lipid panel, thyroid, hormones, liver enzymes, kidney function, inflammatory markers. Flag anything outside reference range.`

async function anthropicVisionRequest(
  systemPrompt: string,
  userPrompt: string,
  imageUrl: string,
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  // Always download first. Anthropic's servers cannot fetch Supabase signed
  // URLs, and the old "guess the type from the URL string" logic broke on
  // signed URLs (the ?token=... query string) and on any file whose extension
  // did not match its real content.
  const fileRes = await fetch(imageUrl)
  if (!fileRes.ok) {
    throw new Error(`Could not download the uploaded file for reading (HTTP ${fileRes.status})`)
  }
  const buffer = Buffer.from(await fileRes.arrayBuffer())
  if (buffer.length === 0) {
    throw new Error('The uploaded file is empty (0 bytes)')
  }
  const base64 = buffer.toString('base64')

  // Sniff the real type from magic bytes, then fall back to the served
  // Content-Type, then to the URL path.
  const headerType = (fileRes.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  let mediaType: string
  if (buffer.subarray(0, 4).toString('latin1') === '%PDF') mediaType = 'application/pdf'
  else if (buffer[0] === 0xff && buffer[1] === 0xd8) mediaType = 'image/jpeg'
  else if (buffer.subarray(1, 4).toString('latin1') === 'PNG') mediaType = 'image/png'
  else if (buffer.subarray(8, 12).toString('latin1') === 'WEBP') mediaType = 'image/webp'
  else if (buffer.subarray(0, 3).toString('latin1') === 'GIF') mediaType = 'image/gif'
  else if (headerType === 'application/pdf' || headerType.startsWith('image/')) mediaType = headerType
  else if (/\.pdf(\?|$)/i.test(imageUrl)) mediaType = 'application/pdf'
  else if (/\.jpe?g(\?|$)/i.test(imageUrl)) mediaType = 'image/jpeg'
  else if (/\.webp(\?|$)/i.test(imageUrl)) mediaType = 'image/webp'
  else if (/\.gif(\?|$)/i.test(imageUrl)) mediaType = 'image/gif'
  else mediaType = 'image/png'

  const isPdf = mediaType === 'application/pdf'

  let content
  if (isPdf) {
    content = [
      {
        type: 'document' as const,
        source: {
          type: 'base64' as const,
          media_type: 'application/pdf' as const,
          data: base64,
        },
      },
      { type: 'text' as const, text: userPrompt },
    ]
  } else {
    content = [
      {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: mediaType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
          data: base64,
        },
      },
      { type: 'text' as const, text: userPrompt },
    ]
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: options?.max_tokens ?? 4096,
      temperature: options?.temperature ?? 0.1,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API error (${res.status}): ${err}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text || ''
}

async function anthropicTextRequest(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; max_tokens?: number }
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
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: options?.max_tokens ?? 4096,
      temperature: options?.temperature ?? 0.2,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API error (${res.status}): ${err}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text || ''
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params

    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await authorizeClientAccess(user.id, clientId)
    if (!access.authorized) {
      return NextResponse.json({ error: access.reason }, { status: 403 })
    }

    const body = await request.json()
    const { file_url, file_type, text_content, document_type } = body

    // Select the appropriate system prompt based on document_type
    let systemPrompt: string
    let extractionPrompt: string

    if (document_type === 'body_scan') {
      systemPrompt = BODY_SCAN_SYSTEM_PROMPT
      extractionPrompt = 'Extract all body composition data from this scan document.'
    } else if (document_type === 'bloodwork') {
      systemPrompt = BLOODWORK_SYSTEM_PROMPT
      extractionPrompt = 'Extract every lab marker from this bloodwork/lab report.'
    } else {
      systemPrompt = PROGRAM_SYSTEM_PROMPT
      extractionPrompt = 'Extract all text content from this fitness/workout document. Include every exercise, set, rep, nutrition target, supplement, and protocol detail.'
    }

    let parsedJson: string

    // If we have a file URL, use Anthropic Vision for extraction + parsing.
    // The real media type is sniffed from the downloaded bytes inside
    // anthropicVisionRequest, so a missing or wrong file_type from the client
    // is no longer a reason to reject the document.
    const looksBinary =
      !file_type ||
      file_type.startsWith('image/') ||
      file_type === 'application/pdf' ||
      file_type === 'application/octet-stream'

    if (file_url && looksBinary) {
      parsedJson = await anthropicVisionRequest(
        systemPrompt,
        extractionPrompt,
        file_url,
        { temperature: 0.1, max_tokens: 4096 }
      )
    } else if (text_content) {
      // For text content, use Anthropic text API
      parsedJson = await anthropicTextRequest(
        systemPrompt,
        `Parse this document:\n\n${text_content}`,
        { temperature: 0.2, max_tokens: 4096 }
      )
    } else {
      return NextResponse.json({ error: 'No file or text content provided' }, { status: 400 })
    }

    // Extract JSON from the response (handle markdown code blocks)
    let parsed
    try {
      const jsonMatch = parsedJson.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, parsedJson]
      parsed = JSON.parse(jsonMatch[1]!.trim())
    } catch {
      // Try parsing the raw response
      try {
        parsed = JSON.parse(parsedJson.trim())
      } catch {
        return NextResponse.json({
          error: 'AI could not parse the document into structured format',
          raw_text: parsedJson,
        }, { status: 422 })
      }
    }

    return NextResponse.json({
      parsed,
      raw_text: parsedJson,
    })
  } catch (err) {
    console.error('[PARSE-DOCUMENT] fatal:', err)
    const message = err instanceof Error ? err.message : 'Server error'
    // Strip anything that could leak the key, keep the actionable part.
    const safe = message.replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    return NextResponse.json({ error: safe }, { status: 500 })
  }
}

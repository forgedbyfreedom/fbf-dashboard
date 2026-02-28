import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chatCompletion, visionCompletion } from '@/lib/openrouter'

const PARSE_SYSTEM_PROMPT = `You are a fitness program parser for Forged by Freedom coaching. Extract structured data from workout/nutrition documents.

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    void clientId // used for auth context

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { file_url, file_type, text_content } = body

    let extractedText = text_content || ''

    // If we have a file URL and it's an image, use vision model
    if (file_url && file_type?.startsWith('image/')) {
      extractedText = await visionCompletion(
        'Extract ALL text from this fitness/workout document image. Include every exercise, set, rep, nutrition target, supplement, and protocol detail. Output the raw text content.',
        'Extract all text content from this document image.',
        file_url,
        { temperature: 0.1, max_tokens: 4096 }
      )
    } else if (file_url && file_type === 'application/pdf') {
      // For PDFs, we can try vision on a rendered version or use text extraction
      // Since we're dealing with uploaded PDFs, try vision approach
      extractedText = await visionCompletion(
        'Extract ALL text from this fitness/workout document. Include every exercise, set, rep, nutrition target, supplement, and protocol detail. Output the raw text content.',
        'Extract all text content from this document.',
        file_url,
        { temperature: 0.1, max_tokens: 4096 }
      )
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'Could not extract text from document' }, { status: 400 })
    }

    // Now parse the extracted text into structured format using Hermes 3
    const parsedJson = await chatCompletion(
      PARSE_SYSTEM_PROMPT,
      `Parse this fitness program document:\n\n${extractedText}`,
      { temperature: 0.2, max_tokens: 4096 }
    )

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
          raw_text: extractedText,
        }, { status: 422 })
      }
    }

    return NextResponse.json({
      parsed,
      raw_text: extractedText,
    })
  } catch (err) {
    console.error('Parse document error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

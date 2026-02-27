import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeFlags, saveFlags } from '@/lib/flags'
import { updateClientMetrics } from '@/lib/metrics'
import { triggerN8nWebhook } from '@/lib/n8n'

function estimateCaloriesBurned(description: string, durationMinutes?: number): number {
  const text = description.toLowerCase()
  const duration = durationMinutes || 60

  // Cardio keywords
  if (/\b(ran|run|running|jog|jogging)\b/.test(text)) {
    const mileMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:miles?|mi)\b/)
    if (mileMatch) return Math.round(parseFloat(mileMatch[1]) * 100)
    return Math.round((duration / 60) * 600)
  }
  if (/\b(bike|cycling|biking|spin|peloton)\b/.test(text)) return Math.round((duration / 60) * 500)
  if (/\b(swim|swimming|laps)\b/.test(text)) return Math.round((duration / 60) * 550)
  if (/\b(hiit|circuit|crossfit|metcon)\b/.test(text)) return Math.round((duration / 60) * 500)
  if (/\b(walk|walking|hike|hiking)\b/.test(text)) return Math.round((duration / 60) * 250)
  if (/\b(stairmaster|stairs|stair\s*mill)\b/.test(text)) return Math.round((duration / 60) * 450)
  if (/\b(elliptical|rowing|row\b)/.test(text)) return Math.round((duration / 60) * 400)

  // Strength / lifting keywords
  if (/\b(bench|squat|deadlift|press|curl|row|pull|push|chest|back|shoulder|leg|arm|bicep|tricep|lift|weight)\b/.test(text)) {
    return Math.round((duration / 60) * 300)
  }

  // Default
  return Math.round((duration / 60) * 250)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, ...checkinData } = body

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    // Validate token
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const supabase = createAdminClient()

    const { data: link, error: linkError } = await supabase
      .from('client_links')
      .select('client_id, clients(id, organization_id, target_steps)')
      .eq('token_hash', tokenHash)
      .eq('status', 'active')
      .single()

    if (linkError || !link) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    const clientId = link.client_id
    const today = new Date().toISOString().split('T')[0]

    // Auto-estimate calories burned from workout description
    if (checkinData.workout_description && !checkinData.estimated_calories_burned) {
      checkinData.estimated_calories_burned = estimateCaloriesBurned(
        checkinData.workout_description,
        checkinData.cardio_minutes ? parseInt(checkinData.cardio_minutes) : undefined
      )
    }

    // Store raw voice transcript if workout was voice-input
    if (checkinData.workout_description && !checkinData.workout_voice_transcript) {
      checkinData.workout_voice_transcript = checkinData.workout_description
    }

    // Upsert check-in (same day = update)
    const { data: checkin, error: checkinError } = await supabase
      .from('checkins')
      .upsert(
        {
          client_id: clientId,
          date: today,
          ...checkinData,
        },
        { onConflict: 'client_id,date' }
      )
      .select()
      .single()

    if (checkinError) {
      console.error('Checkin error:', checkinError)
      return NextResponse.json({ error: 'Failed to save check-in' }, { status: 500 })
    }

    // Compute flags and update metrics (don't block response)
    const clientInfo = link.clients as unknown as { id: string; organization_id: string; target_steps: number | null }

    Promise.all([
      computeFlags(supabase, {
        client_id: clientId,
        organization_id: clientInfo.organization_id,
        target_steps: clientInfo.target_steps,
      }).then(flags => {
        saveFlags(supabase, clientId, flags)
        // Trigger webhook for red flags
        const redFlags = flags.filter(f => f.severity === 'red')
        if (redFlags.length > 0) {
          triggerN8nWebhook('flag.red', { client_id: clientId, flags: redFlags })
        }
      }),
      updateClientMetrics(supabase, clientId),
      triggerN8nWebhook('checkin.created', { client_id: clientId, date: today, checkin_id: checkin.id }),
    ]).catch(err => console.error('Post-checkin processing error:', err))

    return NextResponse.json({ success: true, checkin_id: checkin.id })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

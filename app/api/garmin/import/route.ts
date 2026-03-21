import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface GarminDailySummary {
  calendarDate?: string
  steps?: number
  restingHeartRate?: number
  averageHeartRate?: number
  maxHeartRate?: number
  floorsClimbed?: number
  totalDistanceMeters?: number
  activeKilocalories?: number
  totalKilocalories?: number
  sleepTimeSeconds?: number
  averageStressLevel?: number
  bodyBatteryHighest?: number
  bodyBatteryLowest?: number
  spo2Average?: number
  respirationAverage?: number
  [key: string]: unknown
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { client_id, data } = body as { client_id: string | null; data: GarminDailySummary[] }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'data array is required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    const rows = data
      .filter((d) => d.calendarDate)
      .map((d) => ({
        client_id: client_id || null,
        source: 'garmin',
        date: d.calendarDate,
        steps: d.steps ?? null,
        resting_hr: d.restingHeartRate ?? null,
        avg_hr: d.averageHeartRate ?? null,
        max_hr: d.maxHeartRate ?? null,
        floors_climbed: d.floorsClimbed ?? null,
        distance_meters: d.totalDistanceMeters ?? null,
        active_calories: d.activeKilocalories ?? null,
        total_calories: d.totalKilocalories ?? null,
        sleep_seconds: d.sleepTimeSeconds ?? null,
        avg_stress: d.averageStressLevel ?? null,
        body_battery_high: d.bodyBatteryHighest ?? null,
        body_battery_low: d.bodyBatteryLowest ?? null,
        spo2_avg: d.spo2Average ?? null,
        respiration_avg: d.respirationAverage ?? null,
        raw_json: d,
      }))

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid records with calendarDate found' }, { status: 400 })
    }

    const { error } = await adminSupabase
      .from('wearable_data')
      .upsert(rows, { onConflict: 'client_id,source,date' })

    if (error) {
      console.error('Garmin import error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, imported: rows.length })
  } catch (err) {
    console.error('Garmin import error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

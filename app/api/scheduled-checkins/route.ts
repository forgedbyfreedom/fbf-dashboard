import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    const month = searchParams.get('month') // format: 2026-03

    const adminSupabase = createAdminClient()

    let query = adminSupabase
      .from('scheduled_checkins')
      .select('*, clients(id, first_name, last_name)')
      .eq('coach_user_id', user.id)
      .order('scheduled_for', { ascending: true })

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    if (month) {
      const [year, mon] = month.split('-').map(Number)
      const startDate = `${year}-${String(mon).padStart(2, '0')}-01`
      const lastDay = new Date(year, mon, 0).getDate()
      const endDate = `${year}-${String(mon).padStart(2, '0')}-${lastDay}`
      query = query.gte('scheduled_for', startDate).lte('scheduled_for', endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Scheduled checkins fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch scheduled checkins' }, { status: 500 })
    }

    return NextResponse.json({ checkins: data || [] })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { client_id, type, scheduled_for, notes, recurring } = body

    if (!client_id || !type || !scheduled_for) {
      return NextResponse.json({ error: 'client_id, type, and scheduled_for are required' }, { status: 400 })
    }

    if (!['weekly_email', 'monthly_facetime'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    const rows: Array<{
      client_id: string
      coach_user_id: string
      type: string
      scheduled_for: string
      notes: string | null
    }> = []

    if (recurring && recurring.count > 1) {
      const frequency = recurring.frequency || (type === 'weekly_email' ? 'weekly' : 'monthly')
      for (let i = 0; i < recurring.count; i++) {
        const date = new Date(scheduled_for + 'T12:00:00')
        if (frequency === 'weekly') {
          date.setDate(date.getDate() + i * 7)
        } else {
          date.setMonth(date.getMonth() + i)
        }
        rows.push({
          client_id,
          coach_user_id: user.id,
          type,
          scheduled_for: date.toISOString().split('T')[0],
          notes: notes || null,
        })
      }
    } else {
      rows.push({
        client_id,
        coach_user_id: user.id,
        type,
        scheduled_for,
        notes: notes || null,
      })
    }

    const { data, error } = await adminSupabase
      .from('scheduled_checkins')
      .insert(rows)
      .select('*, clients(id, first_name, last_name)')

    if (error) {
      console.error('Scheduled checkin insert error:', error)
      return NextResponse.json({ error: 'Failed to create scheduled checkins' }, { status: 500 })
    }

    return NextResponse.json({ checkins: data })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

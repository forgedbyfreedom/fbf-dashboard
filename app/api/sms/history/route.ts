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

    if (!clientId) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    const { data, error } = await adminSupabase
      .from('sms_messages')
      .select('id, direction, body, message_type, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('SMS history fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch SMS history' }, { status: 500 })
    }

    return NextResponse.json({ messages: data || [] })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

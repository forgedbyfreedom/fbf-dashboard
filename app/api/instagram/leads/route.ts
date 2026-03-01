import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInstagramDM, isInstagramConfigured } from '@/lib/instagram'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminSupabase = createAdminClient()

    const { data, error } = await adminSupabase
      .from('instagram_leads')
      .select('*, instagram_messages(id, direction, message, created_at)')
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    return NextResponse.json({ leads: data || [] })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Send a DM reply to a lead
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!isInstagramConfigured()) {
      return NextResponse.json({ error: 'Instagram not configured' }, { status: 503 })
    }

    const body = await request.json()
    const { lead_id, message } = body

    if (!lead_id || !message) {
      return NextResponse.json({ error: 'lead_id and message are required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Get the lead
    const { data: lead } = await adminSupabase
      .from('instagram_leads')
      .select('id, instagram_user_id')
      .eq('id', lead_id)
      .single()

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Send the DM
    await sendInstagramDM(lead.instagram_user_id, message)

    // Log outbound message
    await adminSupabase.from('instagram_messages').insert({
      lead_id: lead.id,
      direction: 'outbound',
      message,
      sender_id: 'page',
    })

    // Update lead status to contacted if still new
    await adminSupabase
      .from('instagram_leads')
      .update({ status: 'contacted', updated_at: new Date().toISOString() })
      .eq('id', lead.id)
      .eq('status', 'new')

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send DM'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

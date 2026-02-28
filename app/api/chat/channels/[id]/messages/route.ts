import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: channelId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify membership
    const { data: member } = await supabase
      .from('chat_members')
      .select('id')
      .eq('channel_id', channelId)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this channel' }, { status: 403 })
    }

    // Get cursor for pagination
    const url = new URL(request.url)
    const before = url.searchParams.get('before')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    let query = supabase
      .from('chat_messages')
      .select('id, content, created_at, user_id, profiles:user_id(full_name, avatar_url)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data: messages, error } = await query

    if (error) {
      console.error('Messages fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json({ messages: (messages || []).reverse() })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

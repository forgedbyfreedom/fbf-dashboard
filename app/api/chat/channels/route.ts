import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get channels user is a member of
    const { data: channels, error } = await supabase
      .from('chat_members')
      .select(`
        channel_id,
        chat_channels (
          id,
          name,
          type,
          organization_id,
          created_at
        )
      `)
      .eq('user_id', user.id)

    if (error) {
      console.error('Channels fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 })
    }

    const result = (channels || [])
      .map(c => c.chat_channels)
      .filter(Boolean)

    return NextResponse.json({ channels: result })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { target_user_id } = body

    if (!target_user_id) {
      return NextResponse.json({ error: 'target_user_id required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Get user's org
    const { data: membership } = await adminSupabase
      .from('org_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    let orgId = membership?.organization_id

    // If not an org member, check if they're a client
    if (!orgId) {
      const { data: clientData } = await adminSupabase
        .from('clients')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()
      orgId = clientData?.organization_id
    }

    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Check if DM already exists between these two users
    const { data: existingMembers } = await adminSupabase
      .from('chat_members')
      .select('channel_id')
      .eq('user_id', user.id)

    if (existingMembers && existingMembers.length > 0) {
      const channelIds = existingMembers.map(m => m.channel_id)
      const { data: dmChannels } = await adminSupabase
        .from('chat_channels')
        .select('id')
        .in('id', channelIds)
        .eq('type', 'dm')

      if (dmChannels) {
        for (const ch of dmChannels) {
          const { data: otherMember } = await adminSupabase
            .from('chat_members')
            .select('user_id')
            .eq('channel_id', ch.id)
            .eq('user_id', target_user_id)
            .single()

          if (otherMember) {
            return NextResponse.json({ channel: { id: ch.id } })
          }
        }
      }
    }

    // Get target user's name for DM channel name
    const { data: targetProfile } = await adminSupabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', target_user_id)
      .single()

    const { data: myProfile } = await adminSupabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    const dmName = `${myProfile?.full_name || 'User'} & ${targetProfile?.full_name || 'User'}`

    // Create DM channel
    const { data: channel, error: channelError } = await adminSupabase
      .from('chat_channels')
      .insert({
        organization_id: orgId,
        name: dmName,
        type: 'dm',
        created_by: user.id,
      })
      .select()
      .single()

    if (channelError) {
      console.error('DM create error:', channelError)
      return NextResponse.json({ error: 'Failed to create DM' }, { status: 500 })
    }

    // Add both users as members
    await adminSupabase.from('chat_members').insert([
      { channel_id: channel.id, user_id: user.id },
      { channel_id: channel.id, user_id: target_user_id },
    ])

    return NextResponse.json({ channel })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

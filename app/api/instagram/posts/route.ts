import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminSupabase = createAdminClient()

    const { data, error } = await adminSupabase
      .from('instagram_posts')
      .select('*')
      .eq('coach_user_id', user.id)
      .order('scheduled_for', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }

    return NextResponse.json({ posts: data || [] })
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
    const { caption, image_url, image_urls, post_type, scheduled_for, status } = body

    if (!caption || !scheduled_for) {
      return NextResponse.json({ error: 'caption and scheduled_for are required' }, { status: 400 })
    }

    if (!image_url && (!image_urls || image_urls.length === 0)) {
      return NextResponse.json({ error: 'At least one image URL is required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    const { data, error } = await adminSupabase
      .from('instagram_posts')
      .insert({
        coach_user_id: user.id,
        caption,
        image_url: image_url || null,
        image_urls: image_urls || (image_url ? [image_url] : []),
        post_type: post_type || 'custom',
        status: status || 'scheduled',
        scheduled_for,
      })
      .select()
      .single()

    if (error) {
      console.error('Instagram post create error:', error)
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }

    return NextResponse.json({ post: data })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { publishImage, publishCarousel, isInstagramConfigured } from '@/lib/instagram'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isInstagramConfigured()) {
    return NextResponse.json({ message: 'Instagram not configured', published: 0 })
  }

  const adminSupabase = createAdminClient()

  // Find posts scheduled for now or earlier that haven't been published
  const now = new Date().toISOString()

  const { data: posts } = await adminSupabase
    .from('instagram_posts')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true })
    .limit(5) // Process up to 5 per run to avoid rate limits

  if (!posts || posts.length === 0) {
    return NextResponse.json({ message: 'No posts to publish', published: 0 })
  }

  const results = []

  for (const post of posts) {
    // Mark as publishing
    await adminSupabase
      .from('instagram_posts')
      .update({ status: 'publishing' })
      .eq('id', post.id)

    try {
      let igPostId: string

      if (post.image_urls && post.image_urls.length > 1) {
        // Carousel post
        const result = await publishCarousel({
          imageUrls: post.image_urls,
          caption: post.caption,
        })
        igPostId = result.id
      } else {
        // Single image post
        const imageUrl = post.image_url || (post.image_urls && post.image_urls[0])
        if (!imageUrl) {
          throw new Error('No image URL provided')
        }
        const result = await publishImage({
          imageUrl,
          caption: post.caption,
        })
        igPostId = result.id
      }

      await adminSupabase
        .from('instagram_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          instagram_post_id: igPostId,
        })
        .eq('id', post.id)

      results.push({ id: post.id, status: 'published' })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error(`Instagram publish failed for post ${post.id}:`, errorMsg)

      await adminSupabase
        .from('instagram_posts')
        .update({ status: 'failed', error_message: errorMsg })
        .eq('id', post.id)

      results.push({ id: post.id, status: 'failed', error: errorMsg })
    }
  }

  return NextResponse.json({
    message: 'Instagram posts processed',
    published: results.filter(r => r.status === 'published').length,
    results,
  })
}

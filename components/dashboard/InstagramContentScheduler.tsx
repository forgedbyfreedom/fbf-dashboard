'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'

interface InstagramPost {
  id: string
  caption: string
  image_url: string | null
  post_type: string
  status: string
  scheduled_for: string
  published_at: string | null
  error_message: string | null
  created_at: string
}

interface InstagramContentSchedulerProps {
  initialPosts: InstagramPost[]
}

export default function InstagramContentScheduler({ initialPosts }: InstagramContentSchedulerProps) {
  const [posts, setPosts] = useState<InstagramPost[]>(initialPosts)
  const [showForm, setShowForm] = useState(false)
  const [caption, setCaption] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [postType, setPostType] = useState('motivational')
  const [scheduledFor, setScheduledFor] = useState('')
  const [scheduledTime, setScheduledTime] = useState('09:00')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchPosts = async () => {
    const res = await fetch('/api/instagram/posts')
    if (res.ok) {
      const data = await res.json()
      setPosts(data.posts)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caption || !imageUrl || !scheduledFor) {
      setError('Caption, image URL, and schedule date are required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const dateTime = `${scheduledFor}T${scheduledTime}:00.000Z`
      const res = await fetch('/api/instagram/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          image_url: imageUrl,
          post_type: postType,
          scheduled_for: dateTime,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setCaption('')
      setImageUrl('')
      setScheduledFor('')
      setShowForm(false)
      fetchPosts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/instagram/posts/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setPosts(prev => prev.filter(p => p.id !== id))
    }
  }

  const statusBadge = (status: string): 'green' | 'yellow' | 'red' | 'muted' => {
    return { published: 'green', scheduled: 'yellow', failed: 'red', draft: 'muted', publishing: 'yellow' }[status] as 'green' | 'yellow' | 'red' | 'muted' || 'muted'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Scheduled Posts</h3>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Post'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <h4 className="text-sm font-semibold text-white mb-4">Schedule Instagram Post</h4>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm text-[#888] mb-1.5">Post Type</label>
              <select
                value={postType}
                onChange={e => setPostType(e.target.value)}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
              >
                <option value="motivational">Motivational Quote</option>
                <option value="transformation">Client Transformation</option>
                <option value="tip">Coaching Tip</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <Input
              label="Image URL"
              placeholder="https://... (publicly accessible image URL)"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
            />

            <div>
              <label className="block text-sm text-[#888] mb-1.5">Caption</label>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-[#555] resize-none"
                placeholder="Write your caption... (include hashtags)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date"
                type="date"
                value={scheduledFor}
                onChange={e => setScheduledFor(e.target.value)}
              />
              <Input
                label="Time"
                type="time"
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <Button type="submit" disabled={saving}>
              {saving ? 'Scheduling...' : 'Schedule Post'}
            </Button>
          </form>
        </Card>
      )}

      {posts.length === 0 ? (
        <Card>
          <p className="text-sm text-[#555] text-center py-8">No posts scheduled yet. Click &quot;+ New Post&quot; to get started.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <Card key={post.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={statusBadge(post.status)}>
                      {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                    </Badge>
                    <Badge variant="muted">{post.post_type}</Badge>
                    <span className="text-xs text-[#555]">
                      {post.status === 'published' && post.published_at
                        ? `Published ${new Date(post.published_at).toLocaleDateString()}`
                        : `Scheduled for ${new Date(post.scheduled_for).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                          })}`}
                    </span>
                  </div>
                  <p className="text-sm text-[#ccc] line-clamp-3">{post.caption}</p>
                  {post.error_message && (
                    <p className="text-xs text-red-400 mt-1">{post.error_message}</p>
                  )}
                </div>
                {post.image_url && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#2a2a2a] flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                {post.status !== 'published' && (
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(post.id)}>
                    Delete
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

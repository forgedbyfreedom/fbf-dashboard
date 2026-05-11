import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadAndArchive } from '@/lib/upload-and-archive'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 5MB' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const filePath = `${user.id}/avatar.${ext}`

    const adminSupabase = createAdminClient()

    // Upload to avatars bucket (upsert) + record in archive_objects per phase_2B Priority 3.
    // Profile avatars are user-scoped (no client_id) — archived under stage 'other'.
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    try {
      await uploadAndArchive({
        supabase: adminSupabase,
        bucket: 'avatars',
        path: filePath,
        fileBuffer: buffer,
        contentType: file.type,
        sizeBytes: buffer.byteLength,
        originalName: file.name,
        stage: 'other',
        archivedBy: user.id,
        upsert: true,
      })
    } catch (err) {
      console.error('Upload error:', err)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = adminSupabase.storage.from('avatars').getPublicUrl(filePath)
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`

    // Update profile
    await adminSupabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)

    return NextResponse.json({ avatar_url: avatarUrl })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadAndArchive } from '@/lib/upload-and-archive'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const token = formData.get('token') as string | null

    if (!file || !token) {
      return NextResponse.json({ error: 'File and token required' }, { status: 400 })
    }

    // Validate file
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 })
    }

    // Validate token
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const supabase = createAdminClient()

    const { data: link, error: linkError } = await supabase
      .from('client_links')
      .select('client_id')
      .eq('token_hash', tokenHash)
      .eq('status', 'active')
      .single()

    if (linkError || !link) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    const clientId = link.client_id
    const today = new Date().toISOString().split('T')[0]
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `checkin-files/${clientId}/${today}_${safeName}`

    // Upload file (and record in archive_objects per phase_2B Priority 3)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    try {
      await uploadAndArchive({
        supabase,
        bucket: 'avatars',
        path: filePath,
        fileBuffer: buffer,
        contentType: file.type,
        sizeBytes: buffer.byteLength,
        originalName: file.name,
        stage: 'progress_photo',
        clientId,
        upsert: true,
      })
    } catch (err) {
      console.error('Upload error:', err)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)

    // Insert into files table
    await supabase.from('files').insert({
      client_id: clientId,
      file_type: 'progress_photo',
      file_url: urlData.publicUrl,
      uploaded_at: new Date().toISOString(),
    })

    return NextResponse.json({ url: urlData.publicUrl })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

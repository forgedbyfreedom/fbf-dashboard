import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
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

    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const fileName = `${clientId}/${Date.now()}.${ext}`

    const adminSupabase = createAdminClient()

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await adminSupabase.storage
      .from('client-documents')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: `File upload failed: ${uploadError.message}` }, { status: 500 })
    }

    const { data: urlData } = adminSupabase.storage
      .from('client-documents')
      .getPublicUrl(fileName)

    // For private buckets, create a signed URL instead
    const { data: signedData } = await adminSupabase.storage
      .from('client-documents')
      .createSignedUrl(fileName, 3600) // 1 hour

    const fileUrl = signedData?.signedUrl || urlData.publicUrl

    return NextResponse.json({
      file_url: fileUrl,
      file_name: file.name,
      file_type: file.type,
      storage_path: fileName,
    })
  } catch (err) {
    console.error('Document upload error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

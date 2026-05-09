import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserFromRequest, authorizeClientAccess } from '@/lib/auth-check'
import { createHash } from 'crypto'

const VALID_STAGES = new Set([
  'lead_intake', 'second_stage_intake', 'nda', 'waiver',
  'program_pdf', 'program_json',
  'bloodwork', 'body_scan', 'progress_photo', 'lab_pdf',
  'other',
])

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params

    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await authorizeClientAccess(user.id, clientId)
    if (!access.authorized) {
      return NextResponse.json({ error: access.reason }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const stageRaw = (formData.get('stage') as string | null) ?? 'other'
    const stage = VALID_STAGES.has(stageRaw) ? stageRaw : 'other'

    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const fileName = `${clientId}/${Date.now()}.${ext}`

    const adminSupabase = createAdminClient()

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const sha256 = createHash('sha256').update(buffer).digest('hex')

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

    const { data: archiveRow, error: archiveError } = await adminSupabase
      .from('archive_objects')
      .insert({
        client_id: clientId,
        stage,
        bucket_id: 'client-documents',
        storage_path: fileName,
        original_name: file.name,
        mime_type: file.type || null,
        size_bytes: buffer.byteLength,
        sha256,
        archived_by: user.id,
      })
      .select('id')
      .single()

    if (archiveError) {
      console.error('Archive insert error:', archiveError)
      return NextResponse.json(
        { error: `Storage upload succeeded but archive write failed: ${archiveError.message}` },
        { status: 500 }
      )
    }

    const { data: urlData } = adminSupabase.storage
      .from('client-documents')
      .getPublicUrl(fileName)

    const { data: signedData } = await adminSupabase.storage
      .from('client-documents')
      .createSignedUrl(fileName, 3600)

    const fileUrl = signedData?.signedUrl || urlData.publicUrl

    return NextResponse.json({
      file_url: fileUrl,
      file_name: file.name,
      file_type: file.type,
      storage_path: fileName,
      archive_id: archiveRow.id,
      stage,
    })
  } catch (err) {
    console.error('Document upload error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

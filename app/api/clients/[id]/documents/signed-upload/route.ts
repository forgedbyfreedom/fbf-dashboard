import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserFromRequest, authorizeClientAccess } from '@/lib/auth-check'
import { ALLOWED_ARCHIVE_STAGES, type ArchiveStage } from '@/lib/upload-and-archive'

export const runtime = 'nodejs'

const BUCKET = 'client-documents'
const MAX_BYTES = 20 * 1024 * 1024

/**
 * Mint a one-time signed upload URL so the browser can send the file straight
 * to Supabase Storage.
 *
 * WHY: Vercel serverless functions reject request bodies over ~4.5 MB before
 * the handler ever runs. Any phone photo or multi-page PDF above that died in
 * the old FormData-to-/documents flow with an opaque failure. Direct-to-storage
 * uploads never pass through the function, so the real 20 MB bucket limit
 * is what actually applies.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

    const { stage, filename, mime_type, size_bytes } = await request.json()

    if (!stage || !ALLOWED_ARCHIVE_STAGES.includes(stage as ArchiveStage)) {
      return NextResponse.json(
        { error: `Invalid stage '${stage}'. Allowed: ${ALLOWED_ARCHIVE_STAGES.join(', ')}` },
        { status: 400 },
      )
    }
    if (!filename) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 })
    }
    if (typeof size_bytes === 'number' && size_bytes > MAX_BYTES) {
      return NextResponse.json(
        {
          error: `File is ${(size_bytes / 1024 / 1024).toFixed(1)} MB. The maximum is ${MAX_BYTES / 1024 / 1024} MB — please compress it or export a smaller copy.`,
        },
        { status: 413 },
      )
    }

    const ext = String(filename).includes('.')
      ? String(filename).split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '')
      : 'bin'
    const path = `${clientId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path)

    if (error || !data) {
      console.error('[SIGNED-UPLOAD] createSignedUploadUrl failed:', error)
      return NextResponse.json(
        { error: `Could not prepare upload: ${error?.message ?? 'unknown storage error'}` },
        { status: 500 },
      )
    }

    return NextResponse.json({
      bucket: BUCKET,
      path: data.path,
      token: data.token,
      signed_url: data.signedUrl,
      stage,
      mime_type: mime_type || 'application/octet-stream',
    })
  } catch (err) {
    console.error('[SIGNED-UPLOAD] fatal:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    )
  }
}

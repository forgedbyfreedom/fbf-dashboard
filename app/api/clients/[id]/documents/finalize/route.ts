import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserFromRequest, authorizeClientAccess } from '@/lib/auth-check'
import { ALLOWED_ARCHIVE_STAGES, type ArchiveStage } from '@/lib/upload-and-archive'

export const runtime = 'nodejs'
export const maxDuration = 60

const BUCKET = 'client-documents'

/**
 * Step 2 of the direct-to-storage upload. The bytes are already in Supabase;
 * this verifies they landed, hashes them server-side, writes the permanent
 * archive_objects row, and hands back a signed read URL.
 *
 * The archive row is what makes the "saved forever, sequentially" guarantee
 * real — if this insert fails we say so loudly instead of returning 200.
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

    const { path, stage, original_name, mime_type } = await request.json()

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }
    // Never let a caller claim an object belonging to another client.
    if (!path.startsWith(`${clientId}/`)) {
      return NextResponse.json({ error: 'Upload path does not belong to this client' }, { status: 403 })
    }
    if (!stage || !ALLOWED_ARCHIVE_STAGES.includes(stage as ArchiveStage)) {
      return NextResponse.json(
        { error: `Invalid stage '${stage}'. Allowed: ${ALLOWED_ARCHIVE_STAGES.join(', ')}` },
        { status: 400 },
      )
    }

    const adminSupabase = createAdminClient()

    // Pull the object back down so the hash and size come from what is actually
    // stored, not from what the browser claimed it sent.
    const { data: blob, error: downloadErr } = await adminSupabase.storage
      .from(BUCKET)
      .download(path)

    if (downloadErr || !blob) {
      console.error('[FINALIZE] download failed for', path, downloadErr)
      return NextResponse.json(
        { error: `Upload did not reach storage: ${downloadErr?.message ?? 'object not found'}` },
        { status: 502 },
      )
    }

    const buffer = Buffer.from(await blob.arrayBuffer())
    const sha256 = createHash('sha256').update(buffer).digest('hex')
    const contentType = mime_type || blob.type || 'application/octet-stream'

    const { error: archiveErr } = await adminSupabase.from('archive_objects').insert({
      client_id: clientId,
      stage,
      bucket_id: BUCKET,
      storage_path: path,
      original_name: original_name || path.split('/').pop(),
      mime_type: contentType,
      size_bytes: buffer.length,
      sha256,
      archived_by: user.id,
    })

    if (archiveErr) {
      console.error('[FINALIZE] archive_objects insert failed for', path, archiveErr)
      return NextResponse.json(
        { error: `File stored but archiving failed: ${archiveErr.message}` },
        { status: 500 },
      )
    }

    const { data: signedData, error: signErr } = await adminSupabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600)

    if (signErr || !signedData?.signedUrl) {
      return NextResponse.json(
        { error: `Could not create a read link: ${signErr?.message ?? 'unknown storage error'}` },
        { status: 500 },
      )
    }

    return NextResponse.json({
      file_url: signedData.signedUrl,
      file_type: contentType,
      storage_path: path,
      size_bytes: buffer.length,
      sha256,
    })
  } catch (err) {
    console.error('[FINALIZE] fatal:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    )
  }
}

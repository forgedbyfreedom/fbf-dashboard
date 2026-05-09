import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ArchiveStage =
  | 'lead_intake'
  | 'second_stage_intake'
  | 'nda'
  | 'waiver'
  | 'program_pdf'
  | 'program_json'
  | 'bloodwork'
  | 'body_scan'
  | 'progress_photo'
  | 'lab_pdf'
  | 'other'

export const ALLOWED_ARCHIVE_STAGES: readonly ArchiveStage[] = [
  'lead_intake', 'second_stage_intake', 'nda', 'waiver',
  'program_pdf', 'program_json',
  'bloodwork', 'body_scan', 'progress_photo', 'lab_pdf',
  'other',
]

export interface UploadAndArchiveArgs {
  supabase: SupabaseClient
  bucket: string
  path: string
  fileBuffer: Buffer | ArrayBuffer | Uint8Array
  contentType: string
  sizeBytes: number
  originalName: string
  stage: ArchiveStage
  clientId?: string | null
  leadId?: string | null
  intakeId?: string | null
  programId?: string | null
  archivedBy?: string | null
  upsert?: boolean
}

/**
 * Upload to Supabase Storage AND record an archive_objects row.
 * Throws on either step failure. Caller is responsible for resolving client_id
 * before invoking — this helper does not look up entities.
 *
 * Mirrors phase_2B_brief.md Priority 3.
 */
export async function uploadAndArchive(
  args: UploadAndArchiveArgs,
): Promise<{ path: string; sha256: string }> {
  const {
    supabase, bucket, path, fileBuffer, contentType, sizeBytes, originalName,
    stage, clientId = null, leadId = null, intakeId = null, programId = null,
    archivedBy = null, upsert = false,
  } = args

  if (!ALLOWED_ARCHIVE_STAGES.includes(stage)) {
    throw new Error(
      `Invalid archive stage '${stage}'. Allowed: ${ALLOWED_ARCHIVE_STAGES.join(', ')}`,
    )
  }

  const buf = fileBuffer instanceof Buffer
    ? fileBuffer
    : Buffer.from(fileBuffer instanceof ArrayBuffer ? new Uint8Array(fileBuffer) : fileBuffer)

  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(path, buf, { contentType, upsert })
  if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`)

  const sha256 = createHash('sha256').update(buf).digest('hex')

  const { error: archiveErr } = await supabase.from('archive_objects').insert({
    client_id: clientId,
    lead_id: leadId,
    intake_id: intakeId,
    program_id: programId,
    stage,
    bucket_id: bucket,
    storage_path: path,
    original_name: originalName,
    mime_type: contentType,
    size_bytes: sizeBytes,
    sha256,
    archived_by: archivedBy,
  })
  if (archiveErr) {
    console.error(
      `[ARCHIVE] storage upload to ${bucket}/${path} succeeded but archive_objects insert failed:`,
      archiveErr.message,
    )
    throw new Error(`Archive insert failed: ${archiveErr.message}`)
  }

  return { path, sha256 }
}

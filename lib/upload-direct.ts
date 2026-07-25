'use client'

import { createClient } from '@/lib/supabase/client'
import type { ArchiveStage } from '@/lib/upload-and-archive'

export interface DirectUploadResult {
  file_url: string
  file_type: string
  storage_path: string
  size_bytes: number
  sha256: string
}

const MAX_BYTES = 20 * 1024 * 1024
const COMPRESS_ABOVE_BYTES = 3 * 1024 * 1024
const MAX_EDGE_PX = 2400

async function readJsonError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json()
    if (data?.error) return String(data.error)
  } catch {
    /* fall through to text */
  }
  try {
    const text = await res.text()
    if (text) return text.slice(0, 300)
  } catch {
    /* ignore */
  }
  return `${fallback} (HTTP ${res.status})`
}

/**
 * Shrink oversized phone photos in the browser. Scans are read by OCR/vision,
 * not printed, so 2400px on the long edge is far more resolution than the
 * numbers on an InBody sheet need. PDFs and small images pass through
 * untouched.
 */
async function maybeCompressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (file.type === 'image/gif') return file
  if (file.size <= COMPRESS_ABOVE_BYTES) return file
  if (typeof document === 'undefined') return file

  try {
    const bitmap = await createImageBitmap(file)
    const longEdge = Math.max(bitmap.width, bitmap.height)
    const scale = longEdge > MAX_EDGE_PX ? MAX_EDGE_PX / longEdge : 1

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', 0.88),
    )
    if (!blob || blob.size >= file.size) return file

    const base = file.name.replace(/\.[^.]+$/, '')
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
  } catch {
    // Compression is an optimisation, never a gate. If anything about the
    // canvas path fails we upload the original bytes.
    return file
  }
}

/**
 * Upload a client document straight to Supabase Storage, bypassing the ~4.5 MB
 * Vercel serverless request-body limit that silently killed every large scan,
 * lab PDF and progress photo, then record it in archive_objects.
 *
 * Throws an Error whose message is safe and specific enough to show the coach.
 */
export async function uploadClientDocument(
  clientId: string,
  file: File,
  stage: ArchiveStage,
  onProgress?: (phase: 'compressing' | 'uploading' | 'archiving') => void,
): Promise<DirectUploadResult> {
  onProgress?.('compressing')
  const prepared = await maybeCompressImage(file)

  if (prepared.size > MAX_BYTES) {
    throw new Error(
      `That file is ${(prepared.size / 1024 / 1024).toFixed(1)} MB and the limit is 20 MB. ` +
        `Export a smaller copy or split the PDF, then try again.`,
    )
  }
  if (prepared.size === 0) {
    throw new Error('That file is empty (0 bytes). Re-export it and try again.')
  }

  // 1 — ask our server for a one-time signed upload URL
  const signRes = await fetch(`/api/clients/${clientId}/documents/signed-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stage,
      filename: prepared.name,
      mime_type: prepared.type,
      size_bytes: prepared.size,
    }),
  })
  if (!signRes.ok) {
    throw new Error(await readJsonError(signRes, 'Could not start the upload'))
  }
  const { bucket, path, token } = await signRes.json()

  // 2 — send the bytes browser → Supabase Storage (never through Vercel)
  onProgress?.('uploading')
  const supabase = createClient()
  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, prepared, {
      contentType: prepared.type || 'application/octet-stream',
    })
  if (uploadErr) {
    throw new Error(`Upload to storage failed: ${uploadErr.message}`)
  }

  // 3 — verify + archive server-side, get a signed read URL back
  onProgress?.('archiving')
  const finalizeRes = await fetch(`/api/clients/${clientId}/documents/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path,
      stage,
      original_name: file.name,
      mime_type: prepared.type,
    }),
  })
  if (!finalizeRes.ok) {
    throw new Error(await readJsonError(finalizeRes, 'Upload finished but could not be archived'))
  }

  return finalizeRes.json()
}

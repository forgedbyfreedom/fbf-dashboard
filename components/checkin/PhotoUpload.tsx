'use client'

import { useState, useRef } from 'react'

interface PhotoUploadProps {
  token: string
  onPhotosChange: (urls: string[]) => void
}

export default function PhotoUpload({ token, onPhotosChange }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<Array<{ file: File; preview: string; url?: string; uploading: boolean }>>([])
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  type PhotoEntry = { file: File; preview: string; url?: string; uploading: boolean }

  const handleFiles = async (files: FileList) => {
    setError('')
    const remaining = 3 - photos.length
    if (remaining <= 0) {
      setError('Maximum 3 photos allowed')
      return
    }

    const newFiles = Array.from(files).slice(0, remaining)
    const newPhotos: PhotoEntry[] = newFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
    }))

    const updated: PhotoEntry[] = [...photos, ...newPhotos]
    setPhotos(updated)

    // Upload each file
    for (let i = photos.length; i < updated.length; i++) {
      const photo = updated[i]
      try {
        const formData = new FormData()
        formData.append('file', photo.file)
        formData.append('token', token)

        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()

        if (res.ok && data.url) {
          updated[i] = { ...updated[i], url: data.url, uploading: false }
        } else {
          updated[i] = { ...updated[i], uploading: false }
          setError(data.error || 'Upload failed')
        }
      } catch {
        updated[i] = { ...updated[i], uploading: false }
        setError('Upload failed')
      }
    }

    setPhotos([...updated])
    const urls = updated.filter(p => p.url).map(p => p.url!)
    onPhotosChange(urls)
  }

  const removePhoto = (idx: number) => {
    URL.revokeObjectURL(photos[idx].preview)
    const updated = photos.filter((_, i) => i !== idx)
    setPhotos(updated)
    onPhotosChange(updated.filter(p => p.url).map(p => p.url!))
  }

  return (
    <div>
      <label className="block text-sm text-[#888] mb-2">Progress Photos (max 3)</label>

      <div className="flex gap-3 flex-wrap mb-3">
        {photos.map((photo, i) => (
          <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-[#2a2a2a]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            {photo.uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-[#FF6A00] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!photo.uploading && (
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs"
              >
                x
              </button>
            )}
          </div>
        ))}

        {photos.length < 3 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-24 h-24 rounded-xl border-2 border-dashed border-[#2a2a2a] flex flex-col items-center justify-center text-[#555] hover:border-[#FF6A00] hover:text-[#FF6A00] transition-colors"
          >
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs">Add</span>
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  )
}

'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

interface DropZoneProps {
  onFileAccepted: (file: File) => void
  accept?: Record<string, string[]>
  maxSize?: number
  label?: string
  sublabel?: string
  disabled?: boolean
}

export default function DropZone({
  onFileAccepted,
  accept = {
    'application/pdf': ['.pdf'],
    'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
  },
  maxSize = 20 * 1024 * 1024,
  label = 'Drop a file here, or click to browse',
  sublabel = 'PDF or image up to 20MB',
  disabled = false,
}: DropZoneProps) {
  const [error, setError] = useState('')

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: { errors: readonly { message: string }[] }[]) => {
      setError('')
      if (fileRejections.length > 0) {
        const msg = fileRejections[0].errors.map(e => e.message).join(', ')
        setError(msg)
        return
      }
      if (acceptedFiles.length > 0) {
        onFileAccepted(acceptedFiles[0])
      }
    },
    [onFileAccepted]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled,
  })

  return (
    <div>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragActive
            ? 'border-[#FF6A00] bg-[#FF6A00]/5'
            : 'border-[#2a2a2a] hover:border-[#FF6A00]/50 bg-[#0a0a0a]'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <svg className="w-10 h-10 mx-auto mb-3 text-[#555]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm text-[#ccc]">{isDragActive ? 'Drop it here...' : label}</p>
        <p className="text-xs text-[#555] mt-1">{sublabel}</p>
      </div>
      {error && (
        <p className="text-xs text-red-400 mt-2">{error}</p>
      )}
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ProfileMenuProps {
  userName: string
  avatarUrl?: string | null
}

export default function ProfileMenu({ userName, avatarUrl }: ProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [currentAvatar, setCurrentAvatar] = useState(avatarUrl)
  const menuRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok && data.avatar_url) {
        setCurrentAvatar(data.avatar_url)
        router.refresh()
      }
    } catch (err) {
      console.error('Avatar upload failed:', err)
    } finally {
      setUploading(false)
      setOpen(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden border-2 border-[#2a2a2a] hover:border-[#FF6A00] transition-colors"
      >
        {currentAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentAvatar} alt={userName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-[#FF6A00] bg-[#FF6A00]/10 w-full h-full flex items-center justify-center">
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-[#141414] border border-[#2a2a2a] rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2a2a2a]">
            <p className="text-sm text-white font-medium truncate">{userName}</p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full text-left px-4 py-2.5 text-sm text-[#888] hover:text-white hover:bg-[#1a1a1a] transition-colors"
          >
            {uploading ? 'Uploading...' : 'Change Photo'}
          </button>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-[#1a1a1a] transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  )
}

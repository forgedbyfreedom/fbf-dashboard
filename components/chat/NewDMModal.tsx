'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface NewDMModalProps {
  onSelect: (userId: string) => void
  onClose: () => void
  creating?: boolean
  error?: string
}

interface UserOption {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
}

export default function NewDMModal({ onSelect, onClose, creating = false, error = '' }: NewDMModalProps) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/chat/users')
        const data = await res.json()
        if (res.ok && data.users) {
          setUsers(data.users)
        } else {
          setFetchError(data.error || 'Failed to load users')
        }
      } catch (err) {
        console.error('Failed to fetch users:', err)
        setFetchError('Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return (u.full_name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  })

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget && !creating) onClose()
      }}
    >
      <Card className="max-w-sm w-full" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-3">New Message</h3>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-[#555] mb-3"
          autoFocus
          disabled={creating}
        />

        {(error || fetchError) && (
          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs mb-3">
            {error || fetchError}
          </div>
        )}

        {creating && (
          <div className="text-center py-4">
            <p className="text-sm text-[#FF6A00]">Creating conversation...</p>
          </div>
        )}

        {!creating && (
          <div className="max-h-60 overflow-y-auto space-y-1">
            {loading ? (
              <p className="text-sm text-[#555] text-center py-4">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-[#555] text-center py-4">No users found</p>
            ) : (
              filtered.map(u => (
                <button
                  key={u.id}
                  onClick={() => onSelect(u.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1a1a1a] transition-colors text-left cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[#FF6A00]/10 flex items-center justify-center">
                    {u.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-[#FF6A00]">
                        {(u.full_name || u.email)[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-white">{u.full_name || u.email}</p>
                    {u.full_name && <p className="text-xs text-[#555]">{u.email}</p>}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        <Button variant="secondary" className="w-full mt-3" onClick={onClose} disabled={creating}>
          Cancel
        </Button>
      </Card>
    </div>
  )

  // Use portal to render at document body level, escaping any parent stacking contexts
  if (!mounted) return null
  return createPortal(modalContent, document.body)
}

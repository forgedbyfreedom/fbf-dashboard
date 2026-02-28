'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface NewDMModalProps {
  onSelect: (userId: string) => void
  onClose: () => void
}

interface UserOption {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
}

export default function NewDMModal({ onSelect, onClose }: NewDMModalProps) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get profiles in same org
      const { data: membership } = await supabase
        .from('org_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!membership) {
        setLoading(false)
        return
      }

      // Get org members
      const { data: members } = await supabase
        .from('org_members')
        .select('user_id, profiles(id, full_name, email, avatar_url)')
        .eq('organization_id', membership.organization_id)
        .neq('user_id', user.id)

      // Get clients with user accounts in same org
      const { data: clients } = await supabase
        .from('clients')
        .select('user_id, first_name, last_name, email')
        .eq('organization_id', membership.organization_id)
        .not('user_id', 'is', null)
        .neq('user_id', user.id)

      const memberUsers: UserOption[] = (members || []).map(m => {
        const p = m.profiles as unknown as UserOption
        return { id: p.id, full_name: p.full_name, email: p.email, avatar_url: p.avatar_url }
      })

      const clientUsers: UserOption[] = (clients || [])
        .filter(c => c.user_id && !memberUsers.some(u => u.id === c.user_id))
        .map(c => ({
          id: c.user_id!,
          full_name: `${c.first_name} ${c.last_name}`,
          email: c.email || '',
          avatar_url: null,
        }))

      setUsers([...memberUsers, ...clientUsers])
      setLoading(false)
    }

    fetchUsers()
  }, [])

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return (u.full_name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="max-w-sm w-full">
        <h3 className="text-lg font-bold text-white mb-3">New Message</h3>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-[#555] mb-3"
          autoFocus
        />
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
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1a1a1a] transition-colors text-left"
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
        <Button variant="secondary" className="w-full mt-3" onClick={onClose}>
          Cancel
        </Button>
      </Card>
    </div>
  )
}

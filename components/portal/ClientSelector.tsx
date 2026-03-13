'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
  is_active: boolean
}

interface ClientSelectorProps {
  clients: Client[]
  currentClientId?: string
  showSelfEnroll?: boolean
}

export default function ClientSelector({ clients, currentClientId, showSelfEnroll }: ClientSelectorProps) {
  const [search, setSearch] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const router = useRouter()

  const filtered = clients.filter(c =>
    `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSelfEnroll() {
    setEnrolling(true)
    try {
      const res = await fetch('/api/clients/self-enroll', { method: 'POST' })
      const data = await res.json()
      if (data.client_id) {
        router.refresh()
      }
    } catch {
      // ignore
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <div className="mb-6">
      {showSelfEnroll && (
        <Card>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-white font-semibold">Track Your Own Progress</p>
              <p className="text-xs text-[#888]">Create your own client profile to log check-ins, track body comp, and monitor your stats.</p>
            </div>
            <button
              onClick={handleSelfEnroll}
              disabled={enrolling}
              className="px-5 py-2.5 bg-[#FF6A00] text-white text-sm font-bold rounded-lg hover:bg-[#e85d00] transition-colors disabled:opacity-50 shrink-0 ml-4"
            >
              {enrolling ? 'Setting up...' : 'Start Tracking'}
            </button>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between mt-6 mb-4">
        <h2 className="text-xl font-bold text-white">
          {currentClientId ? 'Switch Client' : 'Select a Client'}
        </h2>
        <a
          href="/portal/add-client"
          className="px-4 py-2 bg-[#FF6A00] text-white text-sm font-bold rounded-lg hover:bg-[#e85d00] transition-colors"
        >
          + Add Client
        </a>
      </div>
      <input
        type="text"
        placeholder="Search clients..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full mb-4 px-4 py-3 bg-[#141414] border border-[#2a2a2a] rounded-lg text-white placeholder-[#555] focus:outline-none focus:border-[#FF6A00] transition-colors"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(client => (
          <div
            key={client.id}
            className={`transition-all ${
              client.id === currentClientId ? 'ring-2 ring-[#FF6A00] rounded-xl' : ''
            }`}
          >
            <Card>
              <div className="flex items-center justify-between">
                <a href={`/portal?client_id=${client.id}`} className="flex-1 min-w-0">
                  <p className="text-white font-semibold">
                    {client.first_name} {client.last_name}
                  </p>
                  <p className="text-xs text-[#555] truncate">{client.email}</p>
                </a>
                <a
                  href={`/portal/client/${client.id}`}
                  className="ml-3 px-3 py-1.5 text-xs font-semibold text-[#888] hover:text-[#FF6A00] bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] hover:border-[#FF6A00]/30 transition-colors shrink-0"
                >
                  Edit
                </a>
              </div>
            </Card>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-[#555] col-span-full text-center py-8">No clients found.</p>
        )}
      </div>
    </div>
  )
}

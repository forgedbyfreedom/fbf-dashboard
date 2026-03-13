'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
  is_active: boolean
  last_weight: number | null
}

interface ClientSelectorProps {
  clients: Client[]
  currentClientId?: string
}

export default function ClientSelector({ clients, currentClientId }: ClientSelectorProps) {
  const [search, setSearch] = useState('')

  const filtered = clients.filter(c =>
    `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-white mb-4">
        {currentClientId ? 'Switch Client' : 'Select a Client'}
      </h2>
      <input
        type="text"
        placeholder="Search clients..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full mb-4 px-4 py-3 bg-[#141414] border border-[#2a2a2a] rounded-lg text-white placeholder-[#555] focus:outline-none focus:border-[#FF6A00] transition-colors"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(client => (
          <a
            key={client.id}
            href={`/portal?client_id=${client.id}`}
            className={`block transition-all ${
              client.id === currentClientId ? 'ring-2 ring-[#FF6A00] rounded-xl' : ''
            }`}
          >
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">
                    {client.first_name} {client.last_name}
                  </p>
                  <p className="text-xs text-[#555]">{client.email}</p>
                </div>
                {client.last_weight && (
                  <p className="text-sm text-[#888]">{client.last_weight} lbs</p>
                )}
              </div>
            </Card>
          </a>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-[#555] col-span-full text-center py-8">No clients found.</p>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import ClientCard from './ClientCard'

interface ClientMetric {
  client_id: string
  clients: {
    id: string
    first_name: string
    last_name: string
  }
  last_checkin_at: string | null
  adherence_7d: number | null
  avg_calories_7d: number | null
  avg_protein_7d: number | null
  avg_steps_7d: number | null
  avg_sleep_7d: number | null
  avg_mood_7d: number | null
  avg_stress_7d: number | null
  avg_water_7d: number | null
  supplement_compliance_7d: number | null
  weight_current: number | null
  weight_delta_7d: number | null
  weight_delta_30d: number | null
  status: 'green' | 'yellow' | 'red'
  open_flags_count: number
}

type SortKey = 'name' | 'status' | 'last_checkin' | 'adherence'
type FilterKey = 'all' | 'red' | 'yellow' | 'missed'

export default function ClientTable({ metrics }: { metrics: ClientMetric[] }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sortBy, setSortBy] = useState<SortKey>('status')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const filtered = useMemo(() => {
    let result = [...metrics]

    // Search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(m =>
        `${m.clients.first_name} ${m.clients.last_name}`.toLowerCase().includes(q)
      )
    }

    // Filter
    if (filter === 'red') result = result.filter(m => m.status === 'red')
    if (filter === 'yellow') result = result.filter(m => m.status === 'yellow')
    if (filter === 'missed') {
      result = result.filter(m => {
        if (!m.last_checkin_at) return true
        const hours = (Date.now() - new Date(m.last_checkin_at).getTime()) / (1000 * 60 * 60)
        return hours > 48
      })
    }

    // Sort
    const statusOrder = { red: 0, yellow: 1, green: 2 }
    result.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'name':
          cmp = `${a.clients.first_name} ${a.clients.last_name}`.localeCompare(
            `${b.clients.first_name} ${b.clients.last_name}`
          )
          break
        case 'status':
          cmp = statusOrder[a.status] - statusOrder[b.status]
          break
        case 'last_checkin':
          cmp = (new Date(b.last_checkin_at || 0).getTime()) - (new Date(a.last_checkin_at || 0).getTime())
          break
        case 'adherence':
          cmp = (b.adherence_7d || 0) - (a.adherence_7d || 0)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [metrics, search, filter, sortBy, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortDir('asc')
    }
  }

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'red', label: 'Red Flags' },
    { key: 'yellow', label: 'Yellow Flags' },
    { key: 'missed', label: 'Missed 48h' },
  ]

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white placeholder-[#555] text-sm flex-1"
        />
        <div className="flex gap-2">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'bg-[#FF6A00] text-white'
                  : 'bg-[#141414] text-[#888] hover:text-white border border-[#2a2a2a]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-left">
                <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => handleSort('name')}>
                  Client {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => handleSort('last_checkin')}>
                  Last Check-in {sortBy === 'last_checkin' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => handleSort('adherence')}>
                  Adherence {sortBy === 'adherence' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Avg Cal</th>
                <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Avg Protein</th>
                <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Avg Steps</th>
                <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Avg Sleep</th>
                <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Mood</th>
                <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Stress</th>
                <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Water</th>
                <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Supps</th>
                <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Weight (7d/30d)</th>
                <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase tracking-wider cursor-pointer hover:text-white" onClick={() => handleSort('status')}>
                  Flags {sortBy === 'status' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(metric => (
                <ClientCard key={metric.client_id} metric={metric} />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-[#555]">
                    {search || filter !== 'all' ? 'No clients match your filters.' : 'No clients yet. Add your first client to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-[#555] mt-2">{filtered.length} of {metrics.length} clients</p>
    </div>
  )
}

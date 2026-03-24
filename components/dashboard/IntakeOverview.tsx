'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  is_active: boolean
  created_at: string
}

interface Intake {
  client_id: string
  completed_at: string | null
  created_at: string
}

interface IntakeOverviewProps {
  clients: Client[]
  intakes: Intake[]
}

export default function IntakeOverview({ clients, intakes }: IntakeOverviewProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [generatingLinks, setGeneratingLinks] = useState<Record<string, boolean>>({})
  const [generatedUrls, setGeneratedUrls] = useState<Record<string, string>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const intakeMap = new Map(intakes.map(i => [i.client_id, i]))

  const completedCount = intakes.filter(i => i.completed_at).length
  const pendingCount = clients.length - completedCount
  const completionRate = clients.length > 0 ? Math.round((completedCount / clients.length) * 100) : 0

  const filtered = clients.filter(c => {
    const intake = intakeMap.get(c.id)
    if (filter === 'completed') return intake?.completed_at
    if (filter === 'pending') return !intake?.completed_at
    return true
  })

  const handleGenerateLink = async (clientId: string, sendEmail = true) => {
    setGeneratingLinks(prev => ({ ...prev, [clientId]: true }))
    try {
      const client = clients.find(c => c.id === clientId)
      if (sendEmail && client?.email) {
        // Generate token AND send email
        const res = await fetch('/api/admin/intakes/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: clientId, email: client.email }),
        })
        const data = await res.json()
        if (res.ok) {
          setGeneratedUrls(prev => ({ ...prev, [clientId]: data.onboarding_link }))
        }
      } else {
        // Just generate link (no email)
        const res = await fetch('/api/intake/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: clientId }),
        })
        const data = await res.json()
        if (res.ok) {
          setGeneratedUrls(prev => ({ ...prev, [clientId]: data.intake_url }))
        }
      }
    } catch (err) {
      console.error('Failed to generate intake link:', err)
    } finally {
      setGeneratingLinks(prev => ({ ...prev, [clientId]: false }))
    }
  }

  const copyLink = (clientId: string) => {
    const url = generatedUrls[clientId]
    if (url) {
      navigator.clipboard.writeText(url)
      setCopiedId(clientId)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <p className="text-xs text-[#555] mb-1">Total Clients</p>
          <p className="text-2xl font-bold text-white">{clients.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-[#555] mb-1">Intake Completed</p>
          <p className="text-2xl font-bold text-green-500">{completedCount}</p>
        </Card>
        <Card>
          <p className="text-xs text-[#555] mb-1">Pending Intake</p>
          <p className="text-2xl font-bold text-yellow-500">{pendingCount}</p>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-[#888]">Overall Completion</p>
          <p className="text-sm font-bold text-white">{completionRate}%</p>
        </div>
        <div className="w-full bg-[#1a1a1a] rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'all' as const, label: `All (${clients.length})` },
          { key: 'pending' as const, label: `Pending (${pendingCount})` },
          { key: 'completed' as const, label: `Completed (${completedCount})` },
        ].map(f => (
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

      {/* Client List */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-left">
              <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Client</th>
              <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Phone</th>
              <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Intake Status</th>
              <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(client => {
              const intake = intakeMap.get(client.id)
              const isCompleted = !!intake?.completed_at
              const url = generatedUrls[client.id]

              return (
                <tr key={client.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/clients/${client.id}`)}
                      className="text-sm font-medium text-white hover:text-[#FF6A00] transition-colors"
                    >
                      {client.first_name} {client.last_name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#888]">{client.email || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#888]">{client.phone || '—'}</td>
                  <td className="px-4 py-3">
                    {isCompleted ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="green">Completed</Badge>
                        <span className="text-xs text-[#555]">
                          {new Date(intake!.completed_at!).toLocaleDateString()}
                        </span>
                      </div>
                    ) : intake ? (
                      <Badge variant="yellow">In Progress</Badge>
                    ) : (
                      <Badge variant="red">Not Started</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!isCompleted && (
                      <div className="flex items-center gap-2">
                        {url ? (
                          <>
                            <Button size="sm" onClick={() => copyLink(client.id)}>
                              {copiedId === client.id ? 'Copied!' : 'Copy Link'}
                            </Button>
                            <span className="text-xs text-[#555] max-w-[200px] truncate hidden lg:inline">{url}</span>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleGenerateLink(client.id)}
                            disabled={generatingLinks[client.id]}
                          >
                            {generatingLinks[client.id] ? 'Generating...' : 'Send Intake Link'}
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[#555]">
                  No clients match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

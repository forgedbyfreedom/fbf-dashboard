'use client'

import { useState, useEffect, useCallback } from 'react'
import VisitorTable from './VisitorTable'

interface Session {
  id: string
  name: string
  csv_file_name: string
  total_rows: number
  auto_approved: number
  auto_denied: number
  manual_review: number
  status: string
  created_at: string
}

interface ScrubResultsProps {
  sessionId: string
  onBack: () => void
}

export default function ScrubResults({ sessionId, onBack }: ScrubResultsProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/scrub/sessions/${sessionId}`)
      const data = await res.json()
      setSession(data.session)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/scrub/sessions/${sessionId}/export`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'scrub_export.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      // Refresh session to show "exported" status
      fetchSession()
    } catch {
      // ignore
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-[#FF6A00] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!session) {
    return <p className="text-[#888] text-center py-12">Session not found.</p>
  }

  const cards = [
    { label: 'Total', value: session.total_rows, color: 'text-white', bg: 'bg-[#1a1a1a]' },
    { label: 'Approved', value: session.auto_approved, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Denied', value: session.auto_denied, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Manual Review', value: session.manual_review, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[#888] text-sm hover:text-white transition-colors"
          >
            &larr; Back
          </button>
          <div>
            <h2 className="text-lg font-bold text-white">{session.name}</h2>
            <p className="text-xs text-[#555]">{session.csv_file_name} &bull; {new Date(session.created_at).toLocaleString()}</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2.5 bg-[#FF6A00] text-white rounded-lg text-sm font-medium hover:bg-[#e55f00] transition-colors disabled:opacity-50"
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className={`${card.bg} border border-[#2a2a2a] rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${card.color}`}>
              {card.value.toLocaleString()}
            </p>
            <p className="text-xs text-[#888] mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Visitor Table */}
      <VisitorTable sessionId={sessionId} onOverrideComplete={fetchSession} />
    </div>
  )
}

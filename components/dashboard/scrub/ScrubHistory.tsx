'use client'

import { useState, useEffect } from 'react'

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

interface ScrubHistoryProps {
  onViewSession: (sessionId: string) => void
}

export default function ScrubHistory({ onViewSession }: ScrubHistoryProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/scrub/sessions')
        const data = await res.json()
        setSessions(data.sessions || [])
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchSessions()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-[#FF6A00] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-12 text-center">
        <p className="text-[#555]">No scrub sessions yet. Upload a CSV to get started.</p>
      </div>
    )
  }

  const statusBadge = (status: string) => {
    const badges: Record<string, { text: string; cls: string }> = {
      pending: { text: 'Pending', cls: 'bg-[#2a2a2a] text-[#888]' },
      processing: { text: 'Processing', cls: 'bg-blue-500/20 text-blue-400' },
      completed: { text: 'Completed', cls: 'bg-green-500/20 text-green-400' },
      exported: { text: 'Exported', cls: 'bg-[#D4A017]/20 text-[#D4A017]' },
    }
    const badge = badges[status] || badges.pending
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>{badge.text}</span>
  }

  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2a2a2a] text-left">
            <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase">Session</th>
            <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase">File</th>
            <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase">Total</th>
            <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase">Approved</th>
            <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase">Denied</th>
            <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase">Review</th>
            <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase">Status</th>
            <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase">Date</th>
            <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase"></th>
          </tr>
        </thead>
        <tbody>
          {sessions.map(s => (
            <tr key={s.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]">
              <td className="px-4 py-3 text-white font-medium">{s.name}</td>
              <td className="px-4 py-3 text-[#888] text-xs">{s.csv_file_name}</td>
              <td className="px-4 py-3 text-[#ccc]">{s.total_rows.toLocaleString()}</td>
              <td className="px-4 py-3 text-green-400">{s.auto_approved.toLocaleString()}</td>
              <td className="px-4 py-3 text-red-400">{s.auto_denied.toLocaleString()}</td>
              <td className="px-4 py-3 text-yellow-400">{s.manual_review.toLocaleString()}</td>
              <td className="px-4 py-3">{statusBadge(s.status)}</td>
              <td className="px-4 py-3 text-[#888] text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onViewSession(s.id)}
                  className="px-3 py-1 bg-[#2a2a2a] text-[#ccc] rounded text-xs hover:bg-[#333] transition-colors"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

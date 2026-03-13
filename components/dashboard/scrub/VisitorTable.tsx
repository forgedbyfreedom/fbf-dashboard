'use client'

import { useState, useEffect, useCallback } from 'react'

interface Visitor {
  id: string
  row_number: number
  raw_data: Record<string, string>
  result: string
  denial_reasons: { rule_name: string; field: string; detail: string }[]
  matched_rule_name: string | null
  override_result: string | null
  override_reason: string | null
  override_at: string | null
}

interface VisitorTableProps {
  sessionId: string
  onOverrideComplete?: () => void
}

type ResultFilter = 'all' | 'approved' | 'denied' | 'manual_review'

export default function VisitorTable({ sessionId, onOverrideComplete }: VisitorTableProps) {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState<ResultFilter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [overrideModal, setOverrideModal] = useState<{ visitorId: string; action: string } | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [bulkAction, setBulkAction] = useState<'approved' | 'denied' | ''>('')
  const [bulkReason, setBulkReason] = useState('')

  const fetchVisitors = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(filter !== 'all' && { result: filter }),
        ...(search && { search }),
      })

      const res = await fetch(`/api/scrub/sessions/${sessionId}/visitors?${params}`)
      const data = await res.json()
      setVisitors(data.visitors || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [sessionId, page, filter, search])

  useEffect(() => {
    fetchVisitors()
  }, [fetchVisitors])

  useEffect(() => {
    setPage(1)
    setSelected(new Set())
  }, [filter, search])

  const handleOverride = async (visitorId: string, overrideResult: string, reason: string) => {
    try {
      await fetch(`/api/scrub/sessions/${sessionId}/visitors/${visitorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ override_result: overrideResult, override_reason: reason }),
      })
      setOverrideModal(null)
      setOverrideReason('')
      fetchVisitors()
      onOverrideComplete?.()
    } catch {
      // ignore
    }
  }

  const handleBulkOverride = async () => {
    if (!bulkAction || selected.size === 0) return

    try {
      await fetch(`/api/scrub/sessions/${sessionId}/visitors/bulk`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor_ids: Array.from(selected),
          override_result: bulkAction,
          override_reason: bulkReason,
        }),
      })
      setSelected(new Set())
      setBulkAction('')
      setBulkReason('')
      fetchVisitors()
      onOverrideComplete?.()
    } catch {
      // ignore
    }
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === visitors.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(visitors.map(v => v.id)))
    }
  }

  const getResultBadge = (v: Visitor) => {
    const finalResult = v.override_result || v.result
    const isOverridden = !!v.override_result

    const badges: Record<string, { text: string; cls: string }> = {
      approved: { text: 'Approved', cls: 'bg-green-500/20 text-green-400' },
      denied: { text: 'Denied', cls: 'bg-red-500/20 text-red-400' },
      manual_review: { text: 'Review', cls: 'bg-yellow-500/20 text-yellow-400' },
      pending: { text: 'Pending', cls: 'bg-[#2a2a2a] text-[#888]' },
    }

    const badge = badges[finalResult] || badges.pending

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>
        {badge.text}
        {isOverridden && <span className="text-[10px] opacity-70">(override)</span>}
      </span>
    )
  }

  const getVisitorName = (raw: Record<string, string>) => {
    return raw.Visitor_Name || raw.visitor_name || raw.Name || raw.name ||
      `${raw.First_Name || raw.first_name || ''} ${raw.Last_Name || raw.last_name || ''}`.trim() || '—'
  }

  const getInmateName = (raw: Record<string, string>) => {
    return raw.Inmate_Name || raw.inmate_name || raw.Inmate || raw.inmate || '—'
  }

  const filters: { key: ResultFilter; label: string }[] = [
    { key: 'all', label: `All (${total})` },
    { key: 'approved', label: 'Approved' },
    { key: 'denied', label: 'Denied' },
    { key: 'manual_review', label: 'Manual Review' },
  ]

  return (
    <div>
      {/* Filter / Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search visitors..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white placeholder-[#555] text-sm flex-1"
        />
        <div className="flex gap-2">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
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

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-white font-medium">{selected.size} selected</span>
          <select
            value={bulkAction}
            onChange={e => setBulkAction(e.target.value as 'approved' | 'denied' | '')}
            className="px-3 py-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-sm text-white"
          >
            <option value="">Action...</option>
            <option value="approved">Approve</option>
            <option value="denied">Deny</option>
          </select>
          <input
            type="text"
            placeholder="Reason (optional)"
            value={bulkReason}
            onChange={e => setBulkReason(e.target.value)}
            className="px-3 py-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-sm text-white flex-1 min-w-[200px]"
          />
          <button
            onClick={handleBulkOverride}
            disabled={!bulkAction}
            className="px-4 py-1.5 bg-[#FF6A00] text-white rounded text-sm font-medium disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-left">
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={visitors.length > 0 && selected.size === visitors.length}
                    onChange={toggleSelectAll}
                    className="rounded border-[#2a2a2a]"
                  />
                </th>
                <th className="px-3 py-3 text-xs font-medium text-[#888] uppercase">#</th>
                <th className="px-3 py-3 text-xs font-medium text-[#888] uppercase">Visitor</th>
                <th className="px-3 py-3 text-xs font-medium text-[#888] uppercase">Inmate</th>
                <th className="px-3 py-3 text-xs font-medium text-[#888] uppercase">Result</th>
                <th className="px-3 py-3 text-xs font-medium text-[#888] uppercase">Denial Reasons</th>
                <th className="px-3 py-3 text-xs font-medium text-[#888] uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#555]">Loading...</td>
                </tr>
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#555]">No visitors match your filters.</td>
                </tr>
              ) : (
                visitors.map(v => (
                  <>
                    <tr
                      key={v.id}
                      className={`border-b border-[#1a1a1a] hover:bg-[#1a1a1a] cursor-pointer ${expandedRow === v.id ? 'bg-[#1a1a1a]' : ''}`}
                      onClick={() => setExpandedRow(expandedRow === v.id ? null : v.id)}
                    >
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(v.id)}
                          onChange={() => toggleSelect(v.id)}
                          className="rounded border-[#2a2a2a]"
                        />
                      </td>
                      <td className="px-3 py-2 text-[#555]">{v.row_number}</td>
                      <td className="px-3 py-2 text-white">{getVisitorName(v.raw_data)}</td>
                      <td className="px-3 py-2 text-[#ccc]">{getInmateName(v.raw_data)}</td>
                      <td className="px-3 py-2">{getResultBadge(v)}</td>
                      <td className="px-3 py-2 text-[#888] text-xs max-w-[300px] truncate">
                        {v.denial_reasons?.map(r => r.rule_name).join(', ') || '—'}
                      </td>
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        {!v.override_result && (v.result === 'denied' || v.result === 'manual_review') && (
                          <button
                            onClick={() => setOverrideModal({ visitorId: v.id, action: v.result === 'denied' ? 'approved' : 'approved' })}
                            className="px-2 py-1 bg-[#2a2a2a] text-[#ccc] rounded text-xs hover:bg-[#333] transition-colors"
                          >
                            Override
                          </button>
                        )}
                      </td>
                    </tr>
                    {/* Expanded row detail */}
                    {expandedRow === v.id && (
                      <tr key={`${v.id}-detail`} className="bg-[#0e0e0e]">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-xs font-medium text-[#888] uppercase mb-2">Denial Reasons</h4>
                              {v.denial_reasons && v.denial_reasons.length > 0 ? (
                                <ul className="space-y-1">
                                  {v.denial_reasons.map((r, i) => (
                                    <li key={i} className="text-sm text-red-400">
                                      <span className="font-medium">{r.rule_name}</span>
                                      <span className="text-[#888]"> — {r.detail}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-[#555]">No denial reasons</p>
                              )}
                              {v.override_result && (
                                <div className="mt-3 p-2 bg-[#1a1a1a] rounded">
                                  <p className="text-xs text-[#888]">
                                    Override: <span className="text-white">{v.override_result}</span>
                                    {v.override_reason && <> — {v.override_reason}</>}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="text-xs font-medium text-[#888] uppercase mb-2">Raw Data</h4>
                              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                {Object.entries(v.raw_data).map(([key, val]) => (
                                  <div key={key} className="flex gap-2 text-xs">
                                    <span className="text-[#888] shrink-0">{key}:</span>
                                    <span className="text-[#ccc]">{val || '(empty)'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-[#555]">Page {page} of {totalPages} ({total} visitors)</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-[#141414] border border-[#2a2a2a] rounded text-sm text-[#888] disabled:opacity-50 hover:text-white"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-[#141414] border border-[#2a2a2a] rounded text-sm text-[#888] disabled:opacity-50 hover:text-white"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {overrideModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md">
            <h3 className="text-white font-medium mb-4">Override Visitor Decision</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-[#888] mb-1 block">New Decision</label>
                <select
                  value={overrideModal.action}
                  onChange={e => setOverrideModal({ ...overrideModal, action: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
                >
                  <option value="approved">Approve</option>
                  <option value="denied">Deny</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-[#888] mb-1 block">Reason</label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
                  placeholder="Optional reason for override"
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setOverrideModal(null); setOverrideReason('') }}
                  className="flex-1 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[#888] text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleOverride(overrideModal.visitorId, overrideModal.action, overrideReason)}
                  className="flex-1 px-4 py-2 bg-[#FF6A00] text-white rounded-lg text-sm font-medium"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

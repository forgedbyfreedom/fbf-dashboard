'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ProgramReview {
  id: string
  client_id: string
  status: string
  error_message: string | null
  generated_at: string | null
  approved_at: string | null
  created_at: string
  clients: {
    id: string
    first_name: string
    last_name: string
    email: string | null
  } | null
}

const statusColors: Record<string, string> = {
  generating: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  pending_review: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const statusLabels: Record<string, string> = {
  generating: 'Generating',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  error: 'Error',
}

export default function ProgramReviewListPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<ProgramReview[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    async function fetchReviews() {
      try {
        const url = filter === 'all'
          ? '/api/admin/programs'
          : `/api/admin/programs?status=${filter}`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setReviews(data.reviews || [])
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchReviews()
  }, [filter])

  const pendingCount = reviews.filter(r => r.status === 'pending_review').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Program Reviews</h2>
          <p className="text-sm text-[#888] mt-1">
            AI-generated programs pending your review and approval.
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="bg-[#FF6A00]/20 text-[#FF6A00] px-3 py-1 rounded-full text-sm font-semibold">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'pending_review', 'generating', 'approved', 'error'].map(status => (
          <button
            key={status}
            onClick={() => { setFilter(status); setLoading(true) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === status
                ? 'bg-[#FF6A00] text-white'
                : 'bg-[#141414] text-[#888] border border-[#2a2a2a] hover:border-[#FF6A00]/50'
            }`}
          >
            {status === 'all' ? 'All' : statusLabels[status] || status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6A00]" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-12 text-center">
          <p className="text-[#555] text-lg">No program reviews found.</p>
          <p className="text-[#444] text-sm mt-2">
            Programs are auto-generated when clients complete their intake form and sign the waiver.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => (
            <button
              key={review.id}
              onClick={() => router.push(`/program-review/${review.id}`)}
              className="w-full bg-[#141414] border border-[#2a2a2a] rounded-xl p-5 hover:border-[#FF6A00]/50 transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold text-lg">
                    {review.clients
                      ? `${review.clients.first_name} ${review.clients.last_name}`
                      : 'Unknown Client'}
                  </h3>
                  {review.clients?.email && (
                    <p className="text-[#666] text-sm">{review.clients.email}</p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[review.status] || 'bg-[#2a2a2a] text-[#888]'}`}>
                  {statusLabels[review.status] || review.status}
                </span>
              </div>

              <div className="flex items-center gap-4 mt-3 text-xs text-[#555]">
                {review.generated_at && (
                  <span>Generated: {new Date(review.generated_at).toLocaleDateString()}</span>
                )}
                {review.approved_at && (
                  <span>Approved: {new Date(review.approved_at).toLocaleDateString()}</span>
                )}
                {review.error_message && (
                  <span className="text-red-400">Error: {review.error_message.substring(0, 80)}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

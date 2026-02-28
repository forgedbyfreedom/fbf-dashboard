'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import CheckInForm from '@/components/checkin/CheckInForm'

interface ClientInfo {
  id: string
  first_name: string
  last_name: string
  target_calories: number | null
  target_protein: number | null
  target_steps: number | null
  weigh_in_day?: string
  current_supplements?: Array<{ name: string; dose: string; frequency: string }>
  current_peds?: Array<{ compound: string; dose: string; frequency: string; route: string }>
  current_peptides?: Array<{ name: string; dose: string; frequency: string; timing: string }>
  last_weight?: number | null
}

export default function CheckInPage() {
  const params = useParams()
  const token = params.token as string
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch('/api/links/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Invalid link')
        } else {
          setClient(data.client)
        }
      } catch {
        setError('Failed to validate link')
      } finally {
        setLoading(false)
      }
    }
    validate()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6A00]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Invalid Link</h2>
          <p className="text-[#888] text-sm">{error}</p>
          <p className="text-[#555] text-xs mt-4">Contact your coach for a new check-in link.</p>
        </div>
      </div>
    )
  }

  if (!client) return null

  return <CheckInForm client={client} token={token} />
}

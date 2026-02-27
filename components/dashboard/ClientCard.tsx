'use client'

import { useRouter } from 'next/navigation'
import FlagBadge from './FlagBadge'

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
  weight_current: number | null
  weight_delta_7d: number | null
  weight_delta_30d: number | null
  status: 'green' | 'yellow' | 'red'
  open_flags_count: number
}

export default function ClientCard({ metric }: { metric: ClientMetric }) {
  const router = useRouter()
  const client = metric.clients

  const statusColors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  }

  const timeSince = (date: string | null) => {
    if (!date) return 'Never'
    const diff = Date.now() - new Date(date).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const formatDelta = (val: number | null) => {
    if (val == null) return '—'
    const sign = val > 0 ? '+' : ''
    return `${sign}${val}`
  }

  return (
    <tr
      onClick={() => router.push(`/clients/${client.id}`)}
      className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a] cursor-pointer transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${statusColors[metric.status]}`} />
          <span className="font-medium text-white">
            {client.first_name} {client.last_name}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-[#888]">{timeSince(metric.last_checkin_at)}</td>
      <td className="px-4 py-3 text-sm text-[#888]">{metric.adherence_7d ?? '—'}%</td>
      <td className="px-4 py-3 text-sm text-[#888]">{metric.avg_calories_7d ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-[#888]">{metric.avg_protein_7d ?? '—'}g</td>
      <td className="px-4 py-3 text-sm text-[#888]">{metric.avg_steps_7d ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-[#888]">{metric.avg_sleep_7d ?? '—'}h</td>
      <td className="px-4 py-3 text-sm text-[#888]">
        {metric.weight_current ?? '—'}
        <span className="text-xs ml-1">
          ({formatDelta(metric.weight_delta_7d)} / {formatDelta(metric.weight_delta_30d)})
        </span>
      </td>
      <td className="px-4 py-3">
        <FlagBadge severity={metric.status} count={metric.open_flags_count} />
      </td>
    </tr>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import FlagBadge from './FlagBadge'

interface ClientMetric {
  client_id: string
  clients: {
    id: string
    first_name: string
    last_name: string
    is_active?: boolean
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

  const moodColor = (val: number | null) => {
    if (val == null) return 'text-[#888]'
    if (val >= 7) return 'text-green-400'
    if (val >= 4) return 'text-yellow-400'
    return 'text-red-400'
  }

  const stressColor = (val: number | null) => {
    if (val == null) return 'text-[#888]'
    if (val <= 4) return 'text-green-400'
    if (val <= 7) return 'text-yellow-400'
    return 'text-red-400'
  }

  const waterColor = (val: number | null) => {
    if (val == null) return 'text-[#888]'
    if (val >= 64) return 'text-blue-400'
    return 'text-yellow-400'
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
      <td className={`px-4 py-3 text-sm ${moodColor(metric.avg_mood_7d)}`}>
        {metric.avg_mood_7d ?? '—'}
      </td>
      <td className={`px-4 py-3 text-sm ${stressColor(metric.avg_stress_7d)}`}>
        {metric.avg_stress_7d ?? '—'}
      </td>
      <td className={`px-4 py-3 text-sm ${waterColor(metric.avg_water_7d)}`}>
        {metric.avg_water_7d ? `${metric.avg_water_7d}oz` : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-[#888]">
        {metric.supplement_compliance_7d != null ? `${Math.round(metric.supplement_compliance_7d)}%` : '—'}
      </td>
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

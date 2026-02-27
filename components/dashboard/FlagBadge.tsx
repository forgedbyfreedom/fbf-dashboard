import Badge from '@/components/ui/Badge'

interface FlagBadgeProps {
  severity: 'green' | 'yellow' | 'red'
  type?: string
  count?: number
}

const flagLabels: Record<string, string> = {
  missed_checkin: 'Missed',
  sleep_crash: 'Sleep',
  steps_low: 'Steps',
  weight_stall: 'Stall',
  side_effects: 'Side FX',
}

export default function FlagBadge({ severity, type, count }: FlagBadgeProps) {
  if (count !== undefined) {
    if (count === 0) return <Badge variant="green">Clear</Badge>
    return <Badge variant={severity}>{count} flag{count > 1 ? 's' : ''}</Badge>
  }

  return (
    <Badge variant={severity}>
      {type ? flagLabels[type] || type : severity}
    </Badge>
  )
}

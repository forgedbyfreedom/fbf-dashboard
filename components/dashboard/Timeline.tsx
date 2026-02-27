import Card from '@/components/ui/Card'

interface Checkin {
  id: string
  date: string
  weight_lbs: number | null
  calories: number | null
  protein_g: number | null
  steps: number | null
  sleep_hours: number | null
  training_done: boolean
  training_type: string | null
  general_notes: string | null
  side_effects_notes: string | null
}

export default function Timeline({ checkins }: { checkins: Checkin[] }) {
  return (
    <div className="space-y-3">
      {checkins.map(c => (
        <Card key={c.id}>
          <div className="flex justify-between items-start mb-3">
            <h4 className="text-sm font-semibold text-white">
              {new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </h4>
            {c.training_done && (
              <span className="text-xs bg-[#FF6A00]/15 text-[#FF6A00] px-2 py-0.5 rounded-full">
                {c.training_type || 'Trained'}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <div>
              <span className="text-[#555] text-xs block">Weight</span>
              <span className="text-white">{c.weight_lbs ?? '—'} lbs</span>
            </div>
            <div>
              <span className="text-[#555] text-xs block">Calories</span>
              <span className="text-white">{c.calories ?? '—'}</span>
            </div>
            <div>
              <span className="text-[#555] text-xs block">Protein</span>
              <span className="text-white">{c.protein_g ?? '—'}g</span>
            </div>
            <div>
              <span className="text-[#555] text-xs block">Steps</span>
              <span className="text-white">{c.steps?.toLocaleString() ?? '—'}</span>
            </div>
            <div>
              <span className="text-[#555] text-xs block">Sleep</span>
              <span className="text-white">{c.sleep_hours ?? '—'}h</span>
            </div>
          </div>
          {c.general_notes && (
            <p className="text-xs text-[#888] mt-3 pt-3 border-t border-[#2a2a2a]">
              {c.general_notes}
            </p>
          )}
          {c.side_effects_notes && (
            <p className="text-xs text-yellow-400 mt-2">
              Side effects: {c.side_effects_notes}
            </p>
          )}
        </Card>
      ))}
      {checkins.length === 0 && (
        <p className="text-sm text-[#555] text-center py-8">No check-ins yet.</p>
      )}
    </div>
  )
}

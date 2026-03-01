'use client'

import { useState } from 'react'
import { ScheduledCheckin } from '@/types/scheduled-checkin'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

interface CalendarDayDetailProps {
  date: string
  checkins: ScheduledCheckin[]
  onMarkComplete: (id: string) => void
  onUndoComplete: (id: string) => void
  onDelete: (id: string) => void
  onAddClick: () => void
  showClientNames?: boolean
}

export default function CalendarDayDetail({
  date,
  checkins,
  onMarkComplete,
  onUndoComplete,
  onDelete,
  onAddClick,
  showClientNames = false,
}: CalendarDayDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const today = new Date().toISOString().split('T')[0]

  const dayLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const typeLabel = (type: string) =>
    type === 'monthly_facetime' ? 'Monthly Facetime' : 'Weekly Email'

  const typeBadgeVariant = (type: string): 'green' | 'yellow' | 'muted' =>
    type === 'monthly_facetime' ? 'yellow' : 'muted'

  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-white">{dayLabel}</h4>
        <Button size="sm" onClick={onAddClick}>+ Add</Button>
      </div>

      {checkins.length === 0 ? (
        <p className="text-sm text-[#555]">No check-ins scheduled for this day.</p>
      ) : (
        <div className="space-y-3">
          {checkins.map(c => {
            const isCompleted = !!c.completed_at
            const isMissed = !isCompleted && date < today

            return (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    isCompleted ? 'bg-green-500' : isMissed ? 'bg-red-500' : 'bg-[#FF6A00]'
                  }`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={typeBadgeVariant(c.type)}>{typeLabel(c.type)}</Badge>
                      {showClientNames && c.clients && (
                        <span className="text-sm text-white">
                          {c.clients.first_name} {c.clients.last_name}
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-xs text-green-400">
                          Completed {new Date(c.completed_at!).toLocaleDateString()}
                        </span>
                      )}
                      {isMissed && (
                        <span className="text-xs text-red-400">Missed</span>
                      )}
                    </div>
                    {c.notes && (
                      <p className="text-xs text-[#888] mt-1 truncate">{c.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  {isCompleted ? (
                    <Button size="sm" variant="ghost" onClick={() => onUndoComplete(c.id)}>
                      Undo
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => onMarkComplete(c.id)}>
                      Complete
                    </Button>
                  )}
                  {confirmDelete === c.id ? (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="danger" onClick={() => { onDelete(c.id); setConfirmDelete(null) }}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(c.id)}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

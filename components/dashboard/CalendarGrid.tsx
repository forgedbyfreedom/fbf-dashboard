'use client'

import { useMemo } from 'react'
import { ScheduledCheckin } from '@/types/scheduled-checkin'

interface CalendarGridProps {
  checkins: ScheduledCheckin[]
  currentMonth: Date
  onMonthChange: (date: Date) => void
  onDayClick: (date: string) => void
  selectedDate: string | null
  showClientNames?: boolean
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarGrid({
  checkins,
  currentMonth,
  onMonthChange,
  onDayClick,
  selectedDate,
  showClientNames = false,
}: CalendarGridProps) {
  const today = new Date().toISOString().split('T')[0]

  const { cells, monthLabel } = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const label = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const dayCells: Array<{ date: string; day: number; inMonth: boolean }> = []

    // Previous month filler
    const prevMonthLast = new Date(year, month, 0).getDate()
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthLast - i
      const m = month === 0 ? 12 : month
      const y = month === 0 ? year - 1 : year
      dayCells.push({
        date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        inMonth: false,
      })
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      dayCells.push({
        date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        inMonth: true,
      })
    }

    // Next month filler (fill to 42 cells)
    const remaining = 42 - dayCells.length
    for (let d = 1; d <= remaining; d++) {
      const m = month + 2 > 12 ? 1 : month + 2
      const y = month + 2 > 12 ? year + 1 : year
      dayCells.push({
        date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        inMonth: false,
      })
    }

    return { cells: dayCells, monthLabel: label }
  }, [currentMonth])

  const checkinsByDate = useMemo(() => {
    const map: Record<string, ScheduledCheckin[]> = {}
    for (const c of checkins) {
      if (!map[c.scheduled_for]) map[c.scheduled_for] = []
      map[c.scheduled_for].push(c)
    }
    return map
  }, [checkins])

  const prevMonth = () => {
    const d = new Date(currentMonth)
    d.setMonth(d.getMonth() - 1)
    onMonthChange(d)
  }

  const nextMonth = () => {
    const d = new Date(currentMonth)
    d.setMonth(d.getMonth() + 1)
    onMonthChange(d)
  }

  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 text-[#888] hover:text-white transition-colors rounded-lg hover:bg-[#1a1a1a]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-lg font-semibold text-white">{monthLabel}</h3>
        <button
          onClick={nextMonth}
          className="p-2 text-[#888] hover:text-white transition-colors rounded-lg hover:bg-[#1a1a1a]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-xs text-[#555] font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map(cell => {
          const dayCheckins = checkinsByDate[cell.date] || []
          const isToday = cell.date === today
          const isSelected = cell.date === selectedDate

          return (
            <button
              key={cell.date}
              onClick={() => onDayClick(cell.date)}
              className={`
                relative min-h-[72px] p-1.5 rounded-lg text-left transition-colors
                ${cell.inMonth ? 'bg-[#0a0a0a]' : 'bg-[#0a0a0a]/40'}
                ${isSelected ? 'ring-2 ring-[#FF6A00]' : ''}
                ${isToday ? 'ring-2 ring-[#FF6A00]/50' : ''}
                ${cell.inMonth ? 'hover:bg-[#1a1a1a]' : 'hover:bg-[#111]'}
              `}
            >
              <span className={`text-xs font-medium ${
                cell.inMonth ? (isToday ? 'text-[#FF6A00]' : 'text-[#ccc]') : 'text-[#333]'
              }`}>
                {cell.day}
              </span>

              {dayCheckins.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {dayCheckins.slice(0, 3).map(c => {
                    let dotColor = 'bg-[#FF6A00]' // upcoming (orange)
                    if (c.completed_at) {
                      dotColor = 'bg-green-500' // completed
                    } else if (cell.date < today) {
                      dotColor = 'bg-red-500' // missed
                    }

                    return (
                      <div key={c.id} className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`} />
                        <span className="text-[10px] text-[#666] truncate leading-tight">
                          {c.scheduled_time
                            ? new Date(`2000-01-01T${c.scheduled_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                            : ''}
                          {showClientNames && c.clients ? ` ${c.clients.first_name}` : ''}
                        </span>
                      </div>
                    )
                  })}
                  {dayCheckins.length > 3 && (
                    <span className="text-[9px] text-[#555]">+{dayCheckins.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

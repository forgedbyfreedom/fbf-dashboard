'use client'

import { useState, useCallback } from 'react'
import { ScheduledCheckin } from '@/types/scheduled-checkin'
import CalendarGrid from './CalendarGrid'
import CalendarDayDetail from './CalendarDayDetail'
import ScheduleForm from './ScheduleForm'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

interface ClientScheduleTabProps {
  clientId: string
  initialCheckins: ScheduledCheckin[]
}

export default function ClientScheduleTab({ clientId, initialCheckins }: ClientScheduleTabProps) {
  const [checkins, setCheckins] = useState<ScheduledCheckin[]>(initialCheckins)
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const fetchCheckins = useCallback(async (month: Date) => {
    const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
    const res = await fetch(`/api/scheduled-checkins?client_id=${clientId}&month=${monthStr}`)
    if (res.ok) {
      const data = await res.json()
      setCheckins(data.checkins)
    }
  }, [clientId])

  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date)
    fetchCheckins(date)
  }

  const handleDayClick = (date: string) => {
    setSelectedDate(prev => prev === date ? null : date)
    setShowForm(false)
  }

  const handleMarkComplete = async (id: string) => {
    const res = await fetch(`/api/scheduled-checkins/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed_at: 'now' }),
    })
    if (res.ok) {
      const data = await res.json()
      setCheckins(prev => prev.map(c => c.id === id ? data.checkin : c))
    }
  }

  const handleUndoComplete = async (id: string) => {
    const res = await fetch(`/api/scheduled-checkins/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed_at: null }),
    })
    if (res.ok) {
      const data = await res.json()
      setCheckins(prev => prev.map(c => c.id === id ? data.checkin : c))
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/scheduled-checkins/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCheckins(prev => prev.filter(c => c.id !== id))
    }
  }

  const handleSaved = () => {
    setShowForm(false)
    fetchCheckins(currentMonth)
  }

  const selectedCheckins = selectedDate
    ? checkins.filter(c => c.scheduled_for === selectedDate)
    : []

  // Upcoming: next 5 uncompleted future check-ins
  const today = new Date().toISOString().split('T')[0]
  const upcoming = checkins
    .filter(c => !c.completed_at && c.scheduled_for >= today)
    .sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for))
    .slice(0, 5)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>+ Schedule Check-in</Button>
      </div>

      {showForm && (
        <ScheduleForm
          clientId={clientId}
          initialDate={selectedDate || undefined}
          onSaved={handleSaved}
          onCancel={() => setShowForm(false)}
        />
      )}

      <CalendarGrid
        checkins={checkins}
        currentMonth={currentMonth}
        onMonthChange={handleMonthChange}
        onDayClick={handleDayClick}
        selectedDate={selectedDate}
        showClientNames={false}
      />

      {selectedDate && !showForm && (
        <CalendarDayDetail
          date={selectedDate}
          checkins={selectedCheckins}
          onMarkComplete={handleMarkComplete}
          onUndoComplete={handleUndoComplete}
          onDelete={handleDelete}
          onAddClick={() => setShowForm(true)}
          showClientNames={false}
        />
      )}

      {/* Upcoming summary */}
      {upcoming.length > 0 && (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6">
          <h4 className="text-sm font-semibold text-[#888] mb-3">Upcoming</h4>
          <div className="space-y-2">
            {upcoming.map(c => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00]" />
                  <Badge variant={c.type === 'monthly_facetime' ? 'yellow' : 'muted'}>
                    {c.type === 'monthly_facetime' ? 'Facetime' : 'Email'}
                  </Badge>
                </div>
                <span className="text-[#888]">
                  {new Date(c.scheduled_for + 'T12:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

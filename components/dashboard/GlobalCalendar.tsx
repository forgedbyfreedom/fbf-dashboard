'use client'

import { useState, useCallback } from 'react'
import { ScheduledCheckin } from '@/types/scheduled-checkin'
import CalendarGrid from './CalendarGrid'
import CalendarDayDetail from './CalendarDayDetail'
import ScheduleForm from './ScheduleForm'
import Button from '@/components/ui/Button'

interface GlobalCalendarProps {
  initialCheckins: ScheduledCheckin[]
  clients: Array<{ id: string; first_name: string; last_name: string }>
}

export default function GlobalCalendar({ initialCheckins, clients }: GlobalCalendarProps) {
  const [checkins, setCheckins] = useState<ScheduledCheckin[]>(initialCheckins)
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const fetchCheckins = useCallback(async (month: Date) => {
    const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
    const res = await fetch(`/api/scheduled-checkins?month=${monthStr}`)
    if (res.ok) {
      const data = await res.json()
      setCheckins(data.checkins)
    }
  }, [])

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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>+ Schedule Check-in</Button>
      </div>

      {showForm && (
        <ScheduleForm
          clients={clients}
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
        showClientNames={true}
      />

      {selectedDate && !showForm && (
        <CalendarDayDetail
          date={selectedDate}
          checkins={selectedCheckins}
          onMarkComplete={handleMarkComplete}
          onUndoComplete={handleUndoComplete}
          onDelete={handleDelete}
          onAddClick={() => setShowForm(true)}
          showClientNames={true}
        />
      )}

    </div>
  )
}

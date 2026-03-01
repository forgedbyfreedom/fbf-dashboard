'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface ScheduleFormProps {
  clientId?: string
  clients?: Array<{ id: string; first_name: string; last_name: string }>
  initialDate?: string
  onSaved: () => void
  onCancel: () => void
}

export default function ScheduleForm({
  clientId,
  clients,
  initialDate,
  onSaved,
  onCancel,
}: ScheduleFormProps) {
  const [selectedClientId, setSelectedClientId] = useState(clientId || '')
  const [type, setType] = useState<'weekly_email' | 'monthly_facetime'>('weekly_email')
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [recurringCount, setRecurringCount] = useState(4)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const targetClientId = clientId || selectedClientId
    if (!targetClientId) {
      setError('Please select a client')
      return
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        client_id: targetClientId,
        type,
        scheduled_for: date,
        notes: notes || null,
      }

      if (recurring && recurringCount > 1) {
        body.recurring = {
          frequency: type === 'weekly_email' ? 'weekly' : 'monthly',
          count: recurringCount,
        }
      }

      const res = await fetch('/api/scheduled-checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 mt-4">
      <h4 className="text-sm font-semibold text-white mb-4">Schedule Check-in</h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!clientId && clients && (
          <div>
            <label className="block text-sm text-[#888] mb-1.5">Client</label>
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
            >
              <option value="">Select a client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm text-[#888] mb-1.5">Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as 'weekly_email' | 'monthly_facetime')}
            className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
          >
            <option value="weekly_email">Weekly Email</option>
            <option value="monthly_facetime">Monthly Facetime</option>
          </select>
        </div>

        <Input
          label="Date"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />

        <div>
          <label className="block text-sm text-[#888] mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-[#555] resize-none"
            placeholder="Optional notes..."
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={recurring}
              onChange={e => setRecurring(e.target.checked)}
              className="accent-[#FF6A00]"
            />
            <span className="text-sm text-[#ccc]">Recurring</span>
          </label>
          {recurring && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={2}
                max={52}
                value={recurringCount}
                onChange={e => setRecurringCount(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white text-sm text-center"
              />
              <span className="text-xs text-[#888]">
                {type === 'weekly_email' ? 'weeks' : 'months'}
              </span>
            </div>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : recurring ? `Schedule ${recurringCount} Check-ins` : 'Schedule'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

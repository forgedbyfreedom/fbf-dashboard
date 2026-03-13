'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'

interface ClientData {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  timezone: string
  is_active: boolean
  weigh_in_day: string
  target_calories: number | null
  target_protein: number | null
  target_carbs: number | null
  target_fats: number | null
  target_steps: number | null
  target_water_oz: number | null
  program_name: string | null
  current_supplements: { name: string; dose: string; frequency: string }[] | null
  current_peds: { name: string; dose: string; frequency: string }[] | null
  current_peptides: { name: string; dose: string; frequency: string }[] | null
}

interface ClientManagerProps {
  client: ClientData
  coachName: string | null
}

export default function ClientManager({ client, coachName }: ClientManagerProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showDeactivate, setShowDeactivate] = useState(false)

  const [form, setForm] = useState({
    first_name: client.first_name || '',
    last_name: client.last_name || '',
    email: client.email || '',
    phone: client.phone || '',
    timezone: client.timezone || 'America/New_York',
    weigh_in_day: client.weigh_in_day || 'monday',
    target_calories: client.target_calories ?? '',
    target_protein: client.target_protein ?? '',
    target_carbs: client.target_carbs ?? '',
    target_fats: client.target_fats ?? '',
    target_steps: client.target_steps ?? '',
    target_water_oz: client.target_water_oz ?? '',
    program_name: client.program_name || '',
  })

  function update(field: string, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)

    const payload: Record<string, unknown> = { ...form }
    // Convert numeric fields
    for (const key of ['target_calories', 'target_protein', 'target_carbs', 'target_fats', 'target_steps', 'target_water_oz']) {
      const val = payload[key]
      payload[key] = val === '' ? null : Number(val)
    }

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSaved(true)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate() {
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to deactivate')
      router.push('/portal')
      router.refresh()
    } catch {
      setError('Failed to deactivate client')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <a href="/portal" className="text-sm text-[#888] hover:text-[#FF6A00] transition-colors">
            ← Back to Clients
          </a>
          <h1 className="text-2xl font-bold text-white mt-2">
            {client.first_name} {client.last_name}
          </h1>
          {coachName && <p className="text-sm text-[#888]">Coach: {coachName}</p>}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/portal?client_id=${client.id}`}
            className="px-4 py-2 bg-[#1a1a1a] text-[#FF6A00] text-sm font-semibold rounded-lg border border-[#2a2a2a] hover:bg-[#222] transition-colors"
          >
            View Dashboard
          </a>
          {client.is_active && (
            <button
              onClick={() => setShowDeactivate(true)}
              className="px-4 py-2 bg-red-500/10 text-red-400 text-sm font-semibold rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              Deactivate
            </button>
          )}
        </div>
      </div>

      {!client.is_active && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          This client is deactivated.
        </div>
      )}

      {/* Personal Info */}
      <Card className="mb-4">
        <h2 className="text-lg font-bold text-white mb-4">Personal Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First Name" value={form.first_name} onChange={v => update('first_name', v)} />
          <Field label="Last Name" value={form.last_name} onChange={v => update('last_name', v)} />
          <Field label="Email" value={form.email} onChange={v => update('email', v)} type="email" />
          <Field label="Phone" value={form.phone} onChange={v => update('phone', v)} type="tel" />
          <div>
            <label className="block text-sm text-[#888] mb-1">Timezone</label>
            <select
              value={form.timezone}
              onChange={e => update('timezone', e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
            >
              <option value="America/New_York">Eastern</option>
              <option value="America/Chicago">Central</option>
              <option value="America/Denver">Mountain</option>
              <option value="America/Los_Angeles">Pacific</option>
              <option value="America/Anchorage">Alaska</option>
              <option value="Pacific/Honolulu">Hawaii</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#888] mb-1">Weigh-In Day</label>
            <select
              value={form.weigh_in_day}
              onChange={e => update('weigh_in_day', e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
            >
              {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(d => (
                <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Targets */}
      <Card className="mb-4">
        <h2 className="text-lg font-bold text-white mb-4">Daily Targets</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Calories" value={form.target_calories} onChange={v => update('target_calories', v)} type="number" />
          <Field label="Protein (g)" value={form.target_protein} onChange={v => update('target_protein', v)} type="number" />
          <Field label="Carbs (g)" value={form.target_carbs} onChange={v => update('target_carbs', v)} type="number" />
          <Field label="Fats (g)" value={form.target_fats} onChange={v => update('target_fats', v)} type="number" />
          <Field label="Steps" value={form.target_steps} onChange={v => update('target_steps', v)} type="number" />
          <Field label="Water (oz)" value={form.target_water_oz} onChange={v => update('target_water_oz', v)} type="number" />
        </div>
      </Card>

      {/* Program */}
      <Card className="mb-4">
        <h2 className="text-lg font-bold text-white mb-4">Program</h2>
        <Field label="Program Name" value={form.program_name} onChange={v => update('program_name', v)} />
      </Card>

      {/* Supplements Display */}
      {client.current_supplements && client.current_supplements.length > 0 && (
        <Card className="mb-4">
          <h2 className="text-lg font-bold text-white mb-4">Current Supplements</h2>
          <div className="space-y-2">
            {client.current_supplements.map((s, i) => (
              <div key={i} className="flex items-center gap-4 text-sm">
                <span className="text-white font-medium">{s.name}</span>
                <span className="text-[#888]">{s.dose}</span>
                <span className="text-[#555]">{s.frequency}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Save / Error */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-[#FF6A00] hover:bg-[#e85d00] text-white font-bold rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {saved && <span className="text-green-400 text-sm">Saved successfully</span>}
        {error && <span className="text-red-400 text-sm">{error}</span>}
      </div>

      {/* Deactivate Modal */}
      {showDeactivate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-2">Deactivate Client</h3>
            <p className="text-sm text-[#888] mb-6">
              Are you sure you want to deactivate {client.first_name} {client.last_name}? They will no longer appear in the active client list.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeactivate(false)}
                className="flex-1 px-4 py-2.5 bg-[#1a1a1a] text-white text-sm font-semibold rounded-lg border border-[#2a2a2a] hover:bg-[#222] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {saving ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string
  value: string | number
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-sm text-[#888] mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-[#555] focus:outline-none focus:border-[#FF6A00] transition-colors"
      />
    </div>
  )
}

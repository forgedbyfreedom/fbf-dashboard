'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'

export default function AddClientForm() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    target_calories: '',
    target_protein: '',
    target_carbs: '',
    target_fats: '',
    target_steps: '',
    weigh_in_day: 'monday',
  })

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name || !form.last_name) {
      setError('First and last name are required')
      return
    }

    setSaving(true)
    setError('')

    const payload: Record<string, unknown> = { ...form }
    for (const key of ['target_calories', 'target_protein', 'target_carbs', 'target_fats', 'target_steps']) {
      const val = payload[key]
      payload[key] = val === '' ? null : Number(val)
    }

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create client')
      router.push(`/portal/client/${data.client.id}`)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create client')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <a href="/portal" className="text-sm text-[#888] hover:text-[#FF6A00] transition-colors">
        ← Back to Clients
      </a>
      <h1 className="text-2xl font-bold text-white mt-2 mb-6">Add New Client</h1>

      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <h2 className="text-lg font-bold text-white mb-4">Personal Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First Name *" value={form.first_name} onChange={v => update('first_name', v)} />
            <Field label="Last Name *" value={form.last_name} onChange={v => update('last_name', v)} />
            <Field label="Email" value={form.email} onChange={v => update('email', v)} type="email" />
            <Field label="Phone" value={form.phone} onChange={v => update('phone', v)} type="tel" />
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

        <Card className="mb-4">
          <h2 className="text-lg font-bold text-white mb-4">Daily Targets</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Calories" value={form.target_calories} onChange={v => update('target_calories', v)} type="number" />
            <Field label="Protein (g)" value={form.target_protein} onChange={v => update('target_protein', v)} type="number" />
            <Field label="Carbs (g)" value={form.target_carbs} onChange={v => update('target_carbs', v)} type="number" />
            <Field label="Fats (g)" value={form.target_fats} onChange={v => update('target_fats', v)} type="number" />
            <Field label="Steps" value={form.target_steps} onChange={v => update('target_steps', v)} type="number" />
          </div>
        </Card>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-[#FF6A00] hover:bg-[#e85d00] text-white font-bold rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create Client'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string
  value: string
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

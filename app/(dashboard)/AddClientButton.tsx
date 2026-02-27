'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface ProtocolRow {
  [key: string]: string
}

function RepeatableRows({
  label,
  fields,
  rows,
  setRows,
  placeholders,
}: {
  label: string
  fields: string[]
  rows: ProtocolRow[]
  setRows: (rows: ProtocolRow[]) => void
  placeholders: Record<string, string>
}) {
  const addRow = () => {
    const empty: ProtocolRow = {}
    fields.forEach(f => (empty[f] = ''))
    setRows([...rows, empty])
  }
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx))
  const updateRow = (idx: number, field: string, value: string) => {
    const updated = [...rows]
    updated[idx] = { ...updated[idx], [field]: value }
    setRows(updated)
  }

  return (
    <div>
      <label className="block text-sm text-[#888] mb-2">{label}</label>
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 mb-2 items-center">
          {fields.map(f => (
            <input
              key={f}
              value={row[f]}
              onChange={e => updateRow(i, f, e.target.value)}
              placeholder={placeholders[f] || f}
              className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-xs placeholder-[#555]"
            />
          ))}
          <button type="button" onClick={() => removeRow(i)} className="text-red-400 text-xs hover:text-red-300 px-1">
            X
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow} className="text-xs text-[#FF6A00] hover:text-[#FF8533]">
        + Add {label.replace(/s$/, '').toLowerCase()}
      </button>
    </div>
  )
}

export default function AddClientButton() {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checkinUrl, setCheckinUrl] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    target_calories: '',
    target_protein: '',
    target_steps: '',
    weigh_in_day: 'monday',
  })

  const [supplements, setSupplements] = useState<ProtocolRow[]>([])
  const [peds, setPeds] = useState<ProtocolRow[]>([])
  const [peptides, setPeptides] = useState<ProtocolRow[]>([])

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      ...form,
      target_calories: form.target_calories ? parseInt(form.target_calories) : null,
      target_protein: form.target_protein ? parseInt(form.target_protein) : null,
      target_steps: form.target_steps ? parseInt(form.target_steps) : null,
      current_supplements: supplements.filter(s => s.name),
      current_peds: peds.filter(p => p.compound),
      current_peptides: peptides.filter(p => p.name),
    }

    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (res.ok) {
      setCheckinUrl(data.checkin_url)
    } else {
      setError(data.error || 'Failed to create client')
    }
    setSaving(false)
  }

  const handleClose = () => {
    setOpen(false)
    setCheckinUrl('')
    setForm({ first_name: '', last_name: '', email: '', phone: '', target_calories: '', target_protein: '', target_steps: '', weigh_in_day: 'monday' })
    setSupplements([])
    setPeds([])
    setPeptides([])
    window.location.reload()
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Add Client</Button>
  }

  if (checkinUrl) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 max-w-md w-full">
          <h3 className="text-lg font-bold text-white mb-2">Client Created!</h3>
          <p className="text-sm text-[#888] mb-4">Share this check-in link with your client:</p>
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 mb-4">
            <p className="text-xs text-[#FF6A00] break-all font-mono">{checkinUrl}</p>
          </div>
          <div className="flex gap-3">
            <Button
              size="sm"
              onClick={() => navigator.clipboard.writeText(checkinUrl)}
            >
              Copy Link
            </Button>
            <Button variant="secondary" size="sm" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-white mb-4">Add New Client</h3>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={form.first_name} onChange={e => update('first_name', e.target.value)} required />
            <Input label="Last Name" value={form.last_name} onChange={e => update('last_name', e.target.value)} required />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={e => update('email', e.target.value)} />
          <Input label="Phone" type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} />

          <div className="grid grid-cols-3 gap-3">
            <Input label="Target Cal" type="number" value={form.target_calories} onChange={e => update('target_calories', e.target.value)} placeholder="2500" />
            <Input label="Target Protein" type="number" value={form.target_protein} onChange={e => update('target_protein', e.target.value)} placeholder="200" />
            <Input label="Target Steps" type="number" value={form.target_steps} onChange={e => update('target_steps', e.target.value)} placeholder="10000" />
          </div>

          <div>
            <label className="block text-sm text-[#888] mb-1.5">Weigh-in Day</label>
            <select
              value={form.weigh_in_day}
              onChange={e => update('weigh_in_day', e.target.value)}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
            >
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(d => (
                <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Protocol sections */}
          <div className="border-t border-[#2a2a2a] pt-4 mt-4">
            <p className="text-xs text-[#D4A017] font-semibold tracking-wider mb-3 uppercase">Protocol</p>

            <RepeatableRows
              label="Supplements"
              fields={['name', 'dose', 'frequency']}
              rows={supplements}
              setRows={setSupplements}
              placeholders={{ name: 'Creatine', dose: '5g', frequency: 'Daily' }}
            />

            <div className="mt-4">
              <RepeatableRows
                label="PEDs"
                fields={['compound', 'dose', 'frequency', 'route']}
                rows={peds}
                setRows={setPeds}
                placeholders={{ compound: 'Test Cyp', dose: '250mg', frequency: '2x/wk', route: 'IM' }}
              />
            </div>

            <div className="mt-4">
              <RepeatableRows
                label="Peptides"
                fields={['name', 'dose', 'frequency', 'timing']}
                rows={peptides}
                setRows={setPeptides}
                placeholders={{ name: 'BPC-157', dose: '250mcg', frequency: 'Daily', timing: 'AM empty' }}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Creating...' : 'Create Client'}
            </Button>
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

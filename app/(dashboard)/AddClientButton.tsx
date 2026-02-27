'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

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
  })

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
    setForm({ first_name: '', last_name: '', email: '', phone: '', target_calories: '', target_protein: '', target_steps: '' })
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
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
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

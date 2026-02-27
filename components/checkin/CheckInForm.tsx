'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

interface ClientInfo {
  id: string
  first_name: string
  last_name: string
  target_calories: number | null
  target_protein: number | null
  target_steps: number | null
}

interface CheckInFormProps {
  client: ClientInfo
  token: string
}

export default function CheckInForm({ client, token }: CheckInFormProps) {
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    weight_lbs: '',
    sleep_hours: '',
    sleep_quality: '',
    steps: '',
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    training_done: false,
    training_type: '',
    workout_notes: '',
    rpe: '',
    cardio_minutes: '',
    supplements_json: '',
    ped_log_json: '',
    side_effects_notes: '',
    general_notes: '',
  })

  const update = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const steps = [
    { title: 'Body & Sleep', subtitle: 'Weight, sleep, steps' },
    { title: 'Nutrition', subtitle: 'Calories and macros' },
    { title: 'Training', subtitle: 'Workout details' },
    { title: 'Supplements & PEDs', subtitle: 'Current protocol' },
    { title: 'Notes', subtitle: 'Anything else' },
  ]

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')

    const payload: Record<string, unknown> = { token }
    for (const [key, val] of Object.entries(form)) {
      if (val === '' || val === false) continue
      if (key === 'training_done') {
        payload[key] = val
        continue
      }
      if (['supplements_json', 'ped_log_json'].includes(key)) {
        payload[key] = (val as string).split('\n').map(s => s.trim()).filter(Boolean)
        continue
      }
      const numFields = ['weight_lbs', 'sleep_hours', 'sleep_quality', 'steps', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'rpe', 'cardio_minutes']
      if (numFields.includes(key)) {
        payload[key] = parseFloat(val as string)
      } else {
        payload[key] = val
      }
    }

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Check-in Submitted!</h2>
          <p className="text-[#888] text-sm">
            Great work, {client.first_name}. Your coach will review your data.
          </p>
        </div>
      </div>
    )
  }

  const inputClass = "w-full px-4 py-4 bg-[#141414] border border-[#2a2a2a] rounded-xl text-white text-lg placeholder-[#555]"

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-lg font-bold text-[#FF6A00] tracking-wider">FORGED BY FREEDOM</h1>
        <p className="text-white text-sm mt-1">Daily Check-in — {client.first_name}</p>
        <p className="text-[#555] text-xs mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-6">
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-[#FF6A00]' : 'bg-[#2a2a2a]'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-[#888] mt-2">{steps[step].title} — {steps[step].subtitle}</p>
      </div>

      {/* Form sections */}
      <div className="px-4 space-y-4">
        {step === 0 && (
          <>
            <div>
              <label className="block text-sm text-[#888] mb-2">Weight (lbs)</label>
              <input type="number" step="0.1" inputMode="decimal" value={form.weight_lbs} onChange={e => update('weight_lbs', e.target.value)} className={inputClass} placeholder="185.5" />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-2">Hours of Sleep</label>
              <input type="number" step="0.5" inputMode="decimal" value={form.sleep_hours} onChange={e => update('sleep_hours', e.target.value)} className={inputClass} placeholder="7.5" />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-2">Sleep Quality (1-10)</label>
              <div className="flex gap-2 flex-wrap">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} type="button" onClick={() => update('sleep_quality', String(n))}
                    className={`w-11 h-11 rounded-xl text-sm font-medium transition-colors ${
                      form.sleep_quality === String(n) ? 'bg-[#FF6A00] text-white' : 'bg-[#141414] text-[#888] border border-[#2a2a2a]'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-2">Steps{client.target_steps ? ` (target: ${client.target_steps.toLocaleString()})` : ''}</label>
              <input type="number" inputMode="numeric" value={form.steps} onChange={e => update('steps', e.target.value)} className={inputClass} placeholder="10000" />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <label className="block text-sm text-[#888] mb-2">Calories{client.target_calories ? ` (target: ${client.target_calories})` : ''}</label>
              <input type="number" inputMode="numeric" value={form.calories} onChange={e => update('calories', e.target.value)} className={inputClass} placeholder="2500" />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-2">Protein (g){client.target_protein ? ` (target: ${client.target_protein}g)` : ''}</label>
              <input type="number" inputMode="numeric" value={form.protein_g} onChange={e => update('protein_g', e.target.value)} className={inputClass} placeholder="200" />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-2">Carbs (g)</label>
              <input type="number" inputMode="numeric" value={form.carbs_g} onChange={e => update('carbs_g', e.target.value)} className={inputClass} placeholder="300" />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-2">Fat (g)</label>
              <input type="number" inputMode="numeric" value={form.fat_g} onChange={e => update('fat_g', e.target.value)} className={inputClass} placeholder="80" />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <label className="block text-sm text-[#888] mb-3">Did you train today?</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => update('training_done', true)}
                  className={`flex-1 py-4 rounded-xl text-sm font-medium transition-colors ${
                    form.training_done ? 'bg-[#FF6A00] text-white' : 'bg-[#141414] text-[#888] border border-[#2a2a2a]'
                  }`}>Yes</button>
                <button type="button" onClick={() => update('training_done', false)}
                  className={`flex-1 py-4 rounded-xl text-sm font-medium transition-colors ${
                    !form.training_done ? 'bg-[#FF6A00] text-white' : 'bg-[#141414] text-[#888] border border-[#2a2a2a]'
                  }`}>No / Rest Day</button>
              </div>
            </div>
            {form.training_done && (
              <>
                <div>
                  <label className="block text-sm text-[#888] mb-2">Training Type</label>
                  <div className="flex gap-2 flex-wrap">
                    {['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Arms', 'Other'].map(t => (
                      <button key={t} type="button" onClick={() => update('training_type', t)}
                        className={`px-4 py-2.5 rounded-xl text-sm transition-colors ${
                          form.training_type === t ? 'bg-[#FF6A00] text-white' : 'bg-[#141414] text-[#888] border border-[#2a2a2a]'
                        }`}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[#888] mb-2">RPE (1-10)</label>
                  <div className="flex gap-2 flex-wrap">
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} type="button" onClick={() => update('rpe', String(n))}
                        className={`w-11 h-11 rounded-xl text-sm font-medium transition-colors ${
                          form.rpe === String(n) ? 'bg-[#FF6A00] text-white' : 'bg-[#141414] text-[#888] border border-[#2a2a2a]'
                        }`}>{n}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[#888] mb-2">Workout Notes</label>
                  <textarea value={form.workout_notes} onChange={e => update('workout_notes', e.target.value)}
                    className={`${inputClass} min-h-[80px]`} placeholder="How did the session go?" />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm text-[#888] mb-2">Cardio (minutes)</label>
              <input type="number" inputMode="numeric" value={form.cardio_minutes} onChange={e => update('cardio_minutes', e.target.value)} className={inputClass} placeholder="30" />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <label className="block text-sm text-[#888] mb-2">Supplements (one per line)</label>
              <textarea value={form.supplements_json} onChange={e => update('supplements_json', e.target.value)}
                className={`${inputClass} min-h-[120px]`} placeholder={"Creatine 5g\nFish Oil 2g\nVitamin D 5000iu"} />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-2">PED Log (one per line)</label>
              <textarea value={form.ped_log_json} onChange={e => update('ped_log_json', e.target.value)}
                className={`${inputClass} min-h-[120px]`} placeholder={"Test Cyp 250mg\nAnavar 50mg"} />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-2">Side Effects</label>
              <textarea value={form.side_effects_notes} onChange={e => update('side_effects_notes', e.target.value)}
                className={`${inputClass} min-h-[80px]`} placeholder="Any side effects to report?" />
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div>
              <label className="block text-sm text-[#888] mb-2">General Notes</label>
              <textarea value={form.general_notes} onChange={e => update('general_notes', e.target.value)}
                className={`${inputClass} min-h-[120px]`} placeholder="How are you feeling? Anything your coach should know?" />
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="px-4 mt-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-[#2a2a2a] px-4 py-4">
        <div className="flex gap-3 max-w-lg mx-auto">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)} className="flex-1" size="lg">
              Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} className="flex-1" size="lg">
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1" size="lg">
              {submitting ? 'Submitting...' : 'Submit Check-in'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

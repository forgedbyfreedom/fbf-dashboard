'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import MoodSelector from '@/components/checkin/MoodSelector'
import WaterTracker from '@/components/checkin/WaterTracker'
import VoiceInput from '@/components/checkin/VoiceInput'
import CompoundLogger from '@/components/checkin/CompoundLogger'
import PhotoUpload from '@/components/checkin/PhotoUpload'

interface SupplementItem {
  name: string
  dose: string
  frequency: string
}

interface PedItem {
  compound: string
  dose: string
  frequency: string
  route: string
}

interface PeptideItem {
  name: string
  dose: string
  frequency: string
  timing: string
}

interface ClientInfo {
  id: string
  first_name: string
  last_name: string
  target_calories: number | null
  target_protein: number | null
  target_steps: number | null
  weigh_in_day?: string
  current_supplements?: SupplementItem[]
  current_peds?: PedItem[]
  current_peptides?: PeptideItem[]
  workout_program?: Array<{ day: string; exercises: Array<{ name: string; sets: string; reps: string }> }>
  cardio_protocol?: Array<{ phase: string; duration: string }>
  medical_protocol?: Array<{ name: string; dose: string; frequency: string; notes: string }>
  target_carbs?: number | null
  target_fats?: number | null
  last_weight?: number | null
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
    // Step 1: Body & Wellness
    weight_lbs: '',
    body_temp: '',
    mood_rating: '',
    mood_notes: '',
    stress_level: '',
    // Step 2: Nutrition & Hydration
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    water_oz: '',
    // Step 3: Activity
    steps: '',
    training_done: false,
    training_type: [] as string[],
    workout_notes: '',
    workout_description: '',
    rpe: '',
    performance_rating: '',
    cardio_minutes: '',
    estimated_calories_burned: '',
    // Step 4: Sleep
    sleep_hours: '',
    sleep_quality: '',
    // Step 5: Supplements & Compliance
    supplement_compliance: true,
    supplements_json: '',
    ped_log_json: '',
    side_effects_notes: '',
    // Step 6: Notes & Photos
    general_notes: '',
  })

  const [compoundLog, setCompoundLog] = useState<Array<{ compound: string; dose: string; route: string }>>([])

  // BJJ state
  const [bjjDone, setBjjDone] = useState(false)
  const [bjjType, setBjjType] = useState<'class' | 'open_mat' | ''>('')
  const [bjjRounds, setBjjRounds] = useState('')
  const [bjjRoundMin, setBjjRoundMin] = useState('5')
  const [bjjRestMin, setBjjRestMin] = useState('1')
  const [bjjDrillMin, setBjjDrillMin] = useState('')
  const [bjjIntensity, setBjjIntensity] = useState<'light' | 'moderate' | 'hard'>('moderate')

  // Progress photos
  const [progressPhotoUrls, setProgressPhotoUrls] = useState<string[]>([])

  // Draft auto-save
  const [draftRestored, setDraftRestored] = useState(false)
  const draftKey = `fbf-checkin-draft-${client.id}-${new Date().toISOString().split('T')[0]}`

  // Restore draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey)
      if (saved) {
        const draft = JSON.parse(saved)
        if (draft.form) setForm(prev => ({ ...prev, ...draft.form }))
        if (draft.bjj) {
          setBjjDone(draft.bjj.done || false)
          setBjjType(draft.bjj.type || '')
          setBjjRounds(draft.bjj.rounds || '')
          setBjjRoundMin(draft.bjj.roundMin || '5')
          setBjjRestMin(draft.bjj.restMin || '1')
          setBjjDrillMin(draft.bjj.drillMin || '')
          setBjjIntensity(draft.bjj.intensity || 'moderate')
        }
        if (draft.compoundLog) setCompoundLog(draft.compoundLog)
        setDraftRestored(true)
        setTimeout(() => setDraftRestored(false), 4000)
      }
    } catch { /* ignore corrupt drafts */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save draft on change
  useEffect(() => {
    try {
      const draft = {
        form,
        bjj: { done: bjjDone, type: bjjType, rounds: bjjRounds, roundMin: bjjRoundMin, restMin: bjjRestMin, drillMin: bjjDrillMin, intensity: bjjIntensity },
        compoundLog,
      }
      localStorage.setItem(draftKey, JSON.stringify(draft))
    } catch { /* ignore storage full */ }
  }, [form, bjjDone, bjjType, bjjRounds, bjjRoundMin, bjjRestMin, bjjDrillMin, bjjIntensity, compoundLog, draftKey])

  // BJJ calorie estimation using MET values and user weight
  // Light drilling: ~5 MET, Moderate rolling: ~8 MET, Hard sparring: ~10 MET
  const estimateBjjCalories = () => {
    const weightLbs = parseFloat(form.weight_lbs) || client.last_weight || 185
    const weightKg = weightLbs / 2.205

    const metValues = { light: 5, moderate: 8, hard: 10 }
    const met = metValues[bjjIntensity]
    const restMet = 2.5 // active rest between rounds

    const rounds = parseInt(bjjRounds) || 0
    const roundMin = parseFloat(bjjRoundMin) || 5
    const restMin = parseFloat(bjjRestMin) || 1
    const drillMin = parseFloat(bjjDrillMin) || 0

    // Rolling calories: MET × weight_kg × hours
    const rollingHours = (rounds * roundMin) / 60
    const restHours = (rounds > 0 ? (rounds - 1) * restMin : 0) / 60
    const drillHours = drillMin / 60

    const rollingCal = Math.round(met * weightKg * rollingHours)
    const restCal = Math.round(restMet * weightKg * restHours)
    const drillCal = Math.round(5 * weightKg * drillHours) // drilling = light MET

    return rollingCal + restCal + drillCal
  }


  const update = (field: string, value: string | boolean | string[]) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const toggleTrainingType = (type: string) => {
    setForm(prev => {
      const current = prev.training_type
      if (current.includes(type)) {
        return { ...prev, training_type: current.filter(t => t !== type) }
      }
      return { ...prev, training_type: [...current, type] }
    })
  }

  // Check if today is the client's weigh-in day
  const today = new Date()
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const todayName = dayNames[today.getDay()]
  const isWeighInDay = !client.weigh_in_day || client.weigh_in_day.toLowerCase() === todayName

  const steps = [
    { title: 'Body & Wellness', subtitle: 'Weight, temp, mood, stress' },
    { title: 'Nutrition & Hydration', subtitle: 'Calories, macros, water' },
    { title: 'Activity', subtitle: 'Steps, workout, cardio' },
    { title: 'Sleep', subtitle: 'Hours and quality' },
    { title: 'Supplements & Compliance', subtitle: 'Protocol adherence' },
    { title: 'Notes & Photos', subtitle: 'Anything else' },
  ]

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')

    const payload: Record<string, unknown> = { token }
    const numFields = [
      'weight_lbs', 'body_temp', 'sleep_hours', 'sleep_quality', 'steps',
      'calories', 'protein_g', 'carbs_g', 'fat_g', 'rpe', 'performance_rating',
      'cardio_minutes', 'mood_rating', 'stress_level', 'water_oz', 'estimated_calories_burned',
    ]

    for (const [key, val] of Object.entries(form)) {
      if (val === '' || val === false) continue
      if (key === 'training_done' || key === 'supplement_compliance') {
        payload[key] = val
        continue
      }
      if (key === 'training_type') {
        const arr = val as string[]
        if (arr.length > 0) payload[key] = arr.join(', ')
        continue
      }
      if (key === 'supplements_json') {
        payload[key] = (val as string).split('\n').map(s => s.trim()).filter(Boolean)
        continue
      }
      if (key === 'ped_log_json') {
        // Combine structured compound log with any free-text notes
        const textEntries = (val as string).split('\n').map(s => s.trim()).filter(Boolean)
        const structuredEntries = compoundLog.map(e => `${e.compound} — ${e.dose} (${e.route})`)
        payload[key] = [...structuredEntries, ...textEntries]
        continue
      }
      if (numFields.includes(key)) {
        payload[key] = parseFloat(val as string)
      } else {
        payload[key] = val
      }
    }

    // Always send supplement_compliance
    payload.supplement_compliance = form.supplement_compliance

    // Append BJJ data to workout description and calorie burn
    if (bjjDone && bjjType) {
      const bjjCal = estimateBjjCalories()
      const bjjLabel = bjjType === 'class' ? 'BJJ Class' : 'BJJ Open Mat'
      const bjjDesc = `${bjjLabel}: ${bjjRounds} rounds × ${bjjRoundMin}min (${bjjRestMin}min rest), intensity: ${bjjIntensity}${bjjDrillMin ? `, ${bjjDrillMin}min drilling` : ''}`

      // Append to workout description
      const existing = (payload.workout_description as string) || ''
      payload.workout_description = existing ? `${existing}\n${bjjDesc}` : bjjDesc

      // Add BJJ training type
      const types = (payload.training_type as string) || ''
      payload.training_type = types ? `${types}, BJJ` : 'BJJ'

      // Add BJJ calories to estimated burn
      const existingCal = (payload.estimated_calories_burned as number) || 0
      payload.estimated_calories_burned = existingCal + bjjCal
    }

    // Include progress photos
    if (progressPhotoUrls.length > 0) {
      payload.progress_photo_urls = progressPhotoUrls
    }

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      try { localStorage.removeItem(draftKey) } catch { /* ignore */ }
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
    <div className="min-h-screen bg-[#0a0a0a] pb-24 relative overflow-hidden">
      {/* Watermark */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt=""
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] max-w-[500px] opacity-[0.15] pointer-events-none select-none z-0"
      />

      {/* Header */}
      <div className="relative z-10 px-4 pt-6 pb-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Forged By Freedom" className="h-20 mx-auto mb-3" />
        <h1 className="text-3xl font-black text-white tracking-widest">FORGED BY FREEDOM</h1>
        <p className="text-xs text-[#D4A017] font-semibold tracking-[0.3em] uppercase mt-2">Strength &bull; Discipline &bull; Freedom</p>
        <p className="text-white text-sm mt-3">Daily Check-in — {client.first_name}</p>
        <p className="text-[#555] text-xs mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 px-4 mb-6">
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
        <p className="text-xs text-[#888] mt-2">
          Step {step + 1}/{steps.length} — {steps[step].title}: {steps[step].subtitle}
        </p>
      </div>

      {/* Draft restored banner */}
      {draftRestored && (
        <div className="relative z-10 px-4 mb-4">
          <div className="p-3 bg-[#FF6A00]/10 border border-[#FF6A00]/20 rounded-xl text-sm text-[#FF6A00] flex items-center justify-between">
            <span>Draft restored from earlier today</span>
            <button onClick={() => setDraftRestored(false)} className="text-[#FF6A00]/60 hover:text-[#FF6A00]">x</button>
          </div>
        </div>
      )}

      {/* Form sections */}
      <div className="relative z-10 px-4 space-y-4">
        {/* Step 1: Body & Wellness */}
        {step === 0 && (
          <>
            {isWeighInDay ? (
              <div>
                <label className="block text-sm text-[#888] mb-2">
                  Weight (lbs) — AM Fasted
                </label>
                <input
                  type="number" step="0.1" inputMode="decimal"
                  value={form.weight_lbs}
                  onChange={e => update('weight_lbs', e.target.value)}
                  className={inputClass}
                  placeholder="185.5"
                />
              </div>
            ) : (
              <div className="p-3 bg-[#141414] border border-[#2a2a2a] rounded-xl">
                <p className="text-sm text-[#555]">
                  Weigh-in day is <span className="text-white capitalize">{client.weigh_in_day || 'Monday'}</span> — no weight needed today
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm text-[#888] mb-2">Body Temperature (°F)</label>
              <input
                type="number" step="0.1" inputMode="decimal"
                value={form.body_temp}
                onChange={e => update('body_temp', e.target.value)}
                className={inputClass}
                placeholder="98.6"
              />
            </div>
            <MoodSelector value={form.mood_rating} onChange={v => update('mood_rating', v)} />
            <div>
              <label className="block text-sm text-[#888] mb-2">How do you feel today?</label>
              <textarea
                value={form.mood_notes}
                onChange={e => update('mood_notes', e.target.value)}
                className={`${inputClass} min-h-[80px] text-base`}
                placeholder="Energy levels, motivation, anything on your mind..."
              />
            </div>
            <MoodSelector
              value={form.stress_level}
              onChange={v => update('stress_level', v)}
              label="Stress Level (1-10)"
            />
          </>
        )}

        {/* Step 2: Nutrition & Hydration */}
        {step === 1 && (
          <>
            <div>
              <label className="block text-sm text-[#888] mb-2">
                Calories{client.target_calories ? ` (target: ${client.target_calories})` : ''}
              </label>
              <input
                type="number" inputMode="numeric"
                value={form.calories}
                onChange={e => update('calories', e.target.value)}
                className={inputClass}
                placeholder="2500"
              />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-2">
                Protein (g){client.target_protein ? ` (target: ${client.target_protein}g)` : ''}
              </label>
              <input
                type="number" inputMode="numeric"
                value={form.protein_g}
                onChange={e => update('protein_g', e.target.value)}
                className={inputClass}
                placeholder="200"
              />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-2">Carbs (g){client.target_carbs ? ` (target: ${client.target_carbs}g)` : ''}</label>
              <input
                type="number" inputMode="numeric"
                value={form.carbs_g}
                onChange={e => update('carbs_g', e.target.value)}
                className={inputClass}
                placeholder="300"
              />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-2">Fat (g){client.target_fats ? ` (target: ${client.target_fats}g)` : ''}</label>
              <input
                type="number" inputMode="numeric"
                value={form.fat_g}
                onChange={e => update('fat_g', e.target.value)}
                className={inputClass}
                placeholder="80"
              />
            </div>
            <WaterTracker value={form.water_oz} onChange={v => update('water_oz', v)} />
          </>
        )}

        {/* Step 3: Activity */}
        {step === 2 && (
          <>
            <div>
              <label className="block text-sm text-[#888] mb-2">
                Steps{client.target_steps ? ` (target: ${client.target_steps.toLocaleString()})` : ''}
              </label>
              <input
                type="number" inputMode="numeric"
                value={form.steps}
                onChange={e => update('steps', e.target.value)}
                className={inputClass}
                placeholder="10000"
              />
            </div>
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
                {/* Show assigned workout program if available */}
                {client.workout_program && client.workout_program.length > 0 && (
                  <div>
                    <label className="block text-sm text-[#D4A017] mb-2 font-semibold">Today&apos;s Assigned Workout</label>
                    <div className="space-y-2 mb-3">
                      {client.workout_program.map((day, i) => (
                        <details key={i} className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
                          <summary className="px-4 py-3 text-sm text-[#FF6A00] font-medium cursor-pointer hover:bg-[#1a1a1a]">
                            {day.day}
                          </summary>
                          <div className="px-4 pb-3">
                            {day.exercises.map((ex, j) => (
                              <p key={j} className="text-xs text-[#ccc] py-0.5 ml-2">
                                {ex.name} — <span className="text-[#888]">{ex.sets}x{ex.reps}</span>
                              </p>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                    <div className="flex gap-3 mb-3">
                      <button type="button"
                        onClick={() => update('workout_description', 'Completed assigned workout as prescribed')}
                        className="flex-1 py-3 rounded-xl text-sm font-medium bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/30 transition-colors"
                      >
                        Completed as assigned
                      </button>
                      <button type="button"
                        onClick={() => update('workout_description', '')}
                        className="flex-1 py-3 rounded-xl text-sm font-medium bg-[#141414] text-[#888] border border-[#2a2a2a] hover:border-[#444] transition-colors"
                      >
                        Modified / Custom
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-[#888] mb-2">What did you train? (select all)</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
                      'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Traps',
                      'Abs', 'Forearms', 'Cardio', 'Full Body',
                    ].map(t => (
                      <button key={t} type="button" onClick={() => toggleTrainingType(t)}
                        className={`px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                          form.training_type.includes(t) ? 'bg-[#FF6A00] text-white' : 'bg-[#141414] text-[#888] border border-[#2a2a2a]'
                        }`}>{t}</button>
                    ))}
                  </div>
                  {form.training_type.length > 0 && (
                    <p className="text-xs text-[#FF6A00] mt-2">{form.training_type.join(', ')}</p>
                  )}
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
                  <label className="block text-sm text-[#888] mb-2">Rate Your Overall Performance Today</label>
                  <div className="flex gap-2 flex-wrap">
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} type="button" onClick={() => update('performance_rating', String(n))}
                        className={`w-11 h-11 rounded-xl text-sm font-medium transition-colors ${
                          form.performance_rating === String(n) ? 'bg-[#D4A017] text-white' : 'bg-[#141414] text-[#888] border border-[#2a2a2a]'
                        }`}>{n}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[#888] mb-2">Describe your workout (voice or type)</label>
                  <VoiceInput
                    value={form.workout_description}
                    onChange={v => update('workout_description', v)}
                    placeholder="E.g., Bench press 225x5x3, incline DB 80x10x3, cable flies..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#888] mb-2">Workout Notes</label>
                  <textarea value={form.workout_notes} onChange={e => update('workout_notes', e.target.value)}
                    className={`${inputClass} min-h-[80px] text-base`} placeholder="How did the session go?" />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm text-[#888] mb-2">Cardio (minutes)</label>
              <input type="number" inputMode="numeric" value={form.cardio_minutes}
                onChange={e => update('cardio_minutes', e.target.value)} className={inputClass} placeholder="30" />
            </div>

            {/* BJJ Section */}
            <div className="pt-2 border-t border-[#2a2a2a]">
              <label className="block text-sm text-[#888] mb-3">Did you do BJJ today?</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setBjjDone(true)}
                  className={`flex-1 py-4 rounded-xl text-sm font-medium transition-colors ${
                    bjjDone ? 'bg-[#FF6A00] text-white' : 'bg-[#141414] text-[#888] border border-[#2a2a2a]'
                  }`}>Yes</button>
                <button type="button" onClick={() => { setBjjDone(false); setBjjType('') }}
                  className={`flex-1 py-4 rounded-xl text-sm font-medium transition-colors ${
                    !bjjDone ? 'bg-[#FF6A00] text-white' : 'bg-[#141414] text-[#888] border border-[#2a2a2a]'
                  }`}>No</button>
              </div>
            </div>

            {bjjDone && (
              <>
                <div>
                  <label className="block text-sm text-[#888] mb-2">Session Type</label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setBjjType('class')}
                      className={`flex-1 py-4 rounded-xl text-sm font-medium transition-colors ${
                        bjjType === 'class' ? 'bg-[#FF6A00] text-white' : 'bg-[#141414] text-[#888] border border-[#2a2a2a]'
                      }`}>
                      <span className="block text-lg">Class</span>
                      <span className="block text-xs mt-0.5 opacity-70">Instruction + rolling</span>
                    </button>
                    <button type="button" onClick={() => setBjjType('open_mat')}
                      className={`flex-1 py-4 rounded-xl text-sm font-medium transition-colors ${
                        bjjType === 'open_mat' ? 'bg-[#FF6A00] text-white' : 'bg-[#141414] text-[#888] border border-[#2a2a2a]'
                      }`}>
                      <span className="block text-lg">Open Mat</span>
                      <span className="block text-xs mt-0.5 opacity-70">Free rolling / sparring</span>
                    </button>
                  </div>
                </div>

                {bjjType && (
                  <>
                    {bjjType === 'class' && (
                      <div>
                        <label className="block text-sm text-[#888] mb-2">Drilling / Instruction Time (minutes)</label>
                        <input type="number" inputMode="numeric" value={bjjDrillMin}
                          onChange={e => setBjjDrillMin(e.target.value)} className={inputClass} placeholder="30" />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm text-[#888] mb-2">Number of Rounds</label>
                      <div className="flex gap-2 flex-wrap">
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                          <button key={n} type="button" onClick={() => setBjjRounds(String(n))}
                            className={`w-12 h-12 rounded-xl text-sm font-medium transition-colors ${
                              bjjRounds === String(n) ? 'bg-[#FF6A00] text-white' : 'bg-[#141414] text-[#888] border border-[#2a2a2a]'
                            }`}>{n}</button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-[#888] mb-2">Round Length (min)</label>
                        <div className="flex gap-2 flex-wrap">
                          {['3','4','5','6','7','8','10'].map(n => (
                            <button key={n} type="button" onClick={() => setBjjRoundMin(n)}
                              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                bjjRoundMin === n ? 'bg-[#FF6A00] text-white' : 'bg-[#141414] text-[#888] border border-[#2a2a2a]'
                              }`}>{n}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-[#888] mb-2">Rest Between (min)</label>
                        <div className="flex gap-2 flex-wrap">
                          {['0','0.5','1','1.5','2','3'].map(n => (
                            <button key={n} type="button" onClick={() => setBjjRestMin(n)}
                              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                bjjRestMin === n ? 'bg-[#FF6A00] text-white' : 'bg-[#141414] text-[#888] border border-[#2a2a2a]'
                              }`}>{n === '0.5' ? '30s' : `${n}`}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-[#888] mb-2">Intensity</label>
                      <div className="flex gap-3">
                        {([
                          { val: 'light' as const, label: 'Light', sub: 'Flow rolling / positional' },
                          { val: 'moderate' as const, label: 'Moderate', sub: 'Standard pace' },
                          { val: 'hard' as const, label: 'Hard', sub: 'Competition pace' },
                        ]).map(opt => (
                          <button key={opt.val} type="button" onClick={() => setBjjIntensity(opt.val)}
                            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                              bjjIntensity === opt.val ? 'bg-[#FF6A00] text-white' : 'bg-[#141414] text-[#888] border border-[#2a2a2a]'
                            }`}>
                            <span className="block">{opt.label}</span>
                            <span className="block text-xs mt-0.5 opacity-70">{opt.sub}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Calorie estimate */}
                    {bjjRounds && (
                      <div className="bg-[#141414] border border-[#D4A017]/30 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-[#D4A017] font-semibold">Estimated BJJ Burn</p>
                            <p className="text-xs text-[#888] mt-1">
                              {bjjRounds} rounds x {bjjRoundMin}min @ {bjjIntensity}
                              {bjjDrillMin ? ` + ${bjjDrillMin}min drilling` : ''}
                              {' '}({parseFloat(form.weight_lbs) || client.last_weight || 185}lbs)
                            </p>
                          </div>
                          <p className="text-2xl font-bold text-[#D4A017]">~{estimateBjjCalories()} cal</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* Step 4: Sleep */}
        {step === 3 && (
          <>
            <div>
              <label className="block text-sm text-[#888] mb-2">Hours of Sleep</label>
              <input type="number" step="0.5" inputMode="decimal" value={form.sleep_hours}
                onChange={e => update('sleep_hours', e.target.value)} className={inputClass} placeholder="7.5" />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-2">Sleep Quality (1-5)</label>
              <div className="flex gap-3">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => update('sleep_quality', String(n))}
                    className={`flex-1 py-4 rounded-xl text-sm font-medium transition-colors ${
                      form.sleep_quality === String(n) ? 'bg-[#FF6A00] text-white' : 'bg-[#141414] text-[#888] border border-[#2a2a2a]'
                    }`}>
                    <span className="block text-lg">{n}</span>
                    <span className="block text-xs mt-0.5">
                      {['Poor', 'Fair', 'Good', 'Great', 'Perfect'][n - 1]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 5: Supplements & Compliance */}
        {step === 4 && (
          <>
            {/* Show client's assigned supplements as checklist */}
            {client.current_supplements && client.current_supplements.length > 0 && (
              <div>
                <label className="block text-sm text-[#D4A017] mb-3 font-semibold">Your Supplement Protocol</label>
                <div className="space-y-2">
                  {client.current_supplements.map((supp, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-[#141414] border border-[#2a2a2a] rounded-xl">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-white text-sm">{supp.name}</span>
                      <span className="text-[#555] text-xs">{supp.dose} — {supp.frequency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm text-[#888] mb-3">Did you take all supplements today?</label>
              <div className="flex gap-3">
                <button type="button" onClick={() => update('supplement_compliance', true)}
                  className={`flex-1 py-4 rounded-xl text-sm font-medium transition-colors ${
                    form.supplement_compliance ? 'bg-green-600 text-white' : 'bg-[#141414] text-[#888] border border-[#2a2a2a]'
                  }`}>Yes, all taken</button>
                <button type="button" onClick={() => update('supplement_compliance', false)}
                  className={`flex-1 py-4 rounded-xl text-sm font-medium transition-colors ${
                    !form.supplement_compliance ? 'bg-red-600 text-white' : 'bg-[#141414] text-[#888] border border-[#2a2a2a]'
                  }`}>Missed some</button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-[#888] mb-2">Supplement Notes</label>
              <textarea
                value={form.supplements_json}
                onChange={e => update('supplements_json', e.target.value)}
                className={`${inputClass} min-h-[60px] text-base`}
                placeholder="Any supplement notes (missed doses, changes, etc.)..."
              />
            </div>

            {/* Structured compound logger */}
            <div>
              <label className="block text-sm text-[#D4A017] mb-2 font-semibold">PED / Peptide / Medical Log</label>
              <p className="text-xs text-[#555] mb-3">Tap your compounds and enter the dose you took today</p>
              <CompoundLogger
                entries={compoundLog}
                onChange={setCompoundLog}
                assignedPeds={client.current_peds}
                assignedPeptides={client.current_peptides}
                assignedMedical={client.medical_protocol}
              />
            </div>

            <div>
              <label className="block text-sm text-[#888] mb-2">Additional PED/Peptide Notes</label>
              <textarea
                value={form.ped_log_json}
                onChange={e => update('ped_log_json', e.target.value)}
                className={`${inputClass} min-h-[60px] text-base`}
                placeholder="Any extra notes about your protocol today..."
              />
            </div>

            <div>
              <label className="block text-sm text-[#888] mb-2">Side Effects</label>
              <VoiceInput
                value={form.side_effects_notes}
                onChange={v => update('side_effects_notes', v)}
                placeholder="Any side effects to report?"
              />
            </div>
          </>
        )}

        {/* Step 6: Notes & Photos */}
        {step === 5 && (
          <>
            <div>
              <label className="block text-sm text-[#888] mb-2">General Notes</label>
              <textarea value={form.general_notes} onChange={e => update('general_notes', e.target.value)}
                className={`${inputClass} min-h-[120px] text-base`} placeholder="How are you feeling? Anything your coach should know?" />
            </div>
            <PhotoUpload token={token} onPhotosChange={setProgressPhotoUrls} />
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

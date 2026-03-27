'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface WorkoutExercise {
  name: string
  sets: string | number
  reps: string
  rest?: string
  notes?: string
}

interface WorkoutDay {
  day: string
  name?: string
  exercises: WorkoutExercise[]
}

interface MealPlanMeal {
  meal: string
  time?: string
  description: string
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  ingredients?: string[]
}

interface CardioProtocol {
  phase: string
  duration: string
  frequency?: string
  notes?: string
}

interface SupplementItem {
  name: string
  dose: string
  frequency: string
}

interface PeptideItem {
  name: string
  dose: string
  frequency: string
  timing: string
}

interface MedicalProtocol {
  name: string
  dose: string
  frequency: string
  notes: string
}

interface GeneratedProgram {
  program_name: string
  target_calories: number
  target_protein: number
  target_carbs: number
  target_fats: number
  target_water_oz: number
  target_steps: number
  weigh_in_day: string
  workout_program: WorkoutDay[]
  meal_plan: MealPlanMeal[]
  cardio_protocol: CardioProtocol[]
  current_supplements: SupplementItem[]
  current_peptides: PeptideItem[]
  medical_protocol: MedicalProtocol[]
  program_raw_text: string
}

export default function ProgramReviewDetailPage() {
  const params = useParams()
  const router = useRouter()
  const reviewId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [review, setReview] = useState<Record<string, unknown> | null>(null)
  const [client, setClient] = useState<Record<string, unknown> | null>(null)
  const [intake, setIntake] = useState<Record<string, unknown> | null>(null)
  const [program, setProgram] = useState<GeneratedProgram | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchReview = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/programs/${reviewId}`)
      if (res.ok) {
        const data = await res.json()
        setReview(data.review)
        setClient(data.client)
        setIntake(data.intake)
        if (data.review?.generated_program) {
          setProgram(data.review.generated_program as GeneratedProgram)
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load program review' })
    } finally {
      setLoading(false)
    }
  }, [reviewId])

  useEffect(() => { fetchReview() }, [fetchReview])

  const handleSave = async () => {
    if (!program) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/programs/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generated_program: program }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Changes saved' })
      } else {
        setMessage({ type: 'error', text: 'Failed to save' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Save error' })
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async () => {
    if (!program) return
    if (!confirm('Approve and send this program to the client? This will update their account and email them.')) return

    setApproving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/programs/${reviewId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Program approved and delivered!' })
        setTimeout(() => fetchReview(), 1000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Approval failed' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Approval error' })
    } finally {
      setApproving(false)
    }
  }

  const handleRegenerate = async () => {
    if (!confirm('Regenerate this program? The current version will be replaced.')) return

    setRegenerating(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/programs/${reviewId}/regenerate`, {
        method: 'POST',
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Program regenerated successfully' })
        setTimeout(() => { setLoading(true); fetchReview() }, 1000)
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Regeneration failed' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Regeneration error' })
    } finally {
      setRegenerating(false)
    }
  }

  // Update helpers
  const updateField = (field: keyof GeneratedProgram, value: unknown) => {
    if (!program) return
    setProgram({ ...program, [field]: value })
  }

  const updateExercise = (dayIdx: number, exIdx: number, field: keyof WorkoutExercise, value: string) => {
    if (!program) return
    const wp = [...program.workout_program]
    const exercises = [...wp[dayIdx].exercises]
    exercises[exIdx] = { ...exercises[exIdx], [field]: value }
    wp[dayIdx] = { ...wp[dayIdx], exercises }
    setProgram({ ...program, workout_program: wp })
  }

  const addExercise = (dayIdx: number) => {
    if (!program) return
    const wp = [...program.workout_program]
    wp[dayIdx] = {
      ...wp[dayIdx],
      exercises: [...wp[dayIdx].exercises, { name: '', sets: '3', reps: '10-12', rest: '60s', notes: '' }],
    }
    setProgram({ ...program, workout_program: wp })
  }

  const removeExercise = (dayIdx: number, exIdx: number) => {
    if (!program) return
    const wp = [...program.workout_program]
    wp[dayIdx] = {
      ...wp[dayIdx],
      exercises: wp[dayIdx].exercises.filter((_, i) => i !== exIdx),
    }
    setProgram({ ...program, workout_program: wp })
  }

  const addWorkoutDay = () => {
    if (!program) return
    const dayNum = program.workout_program.length + 1
    setProgram({
      ...program,
      workout_program: [...program.workout_program, { day: `Day ${dayNum}`, name: '', exercises: [] }],
    })
  }

  const removeWorkoutDay = (dayIdx: number) => {
    if (!program) return
    setProgram({
      ...program,
      workout_program: program.workout_program.filter((_, i) => i !== dayIdx),
    })
  }

  const updateMeal = (mealIdx: number, field: string, value: unknown) => {
    if (!program) return
    const mp = [...program.meal_plan]
    mp[mealIdx] = { ...mp[mealIdx], [field]: value }
    setProgram({ ...program, meal_plan: mp })
  }

  const addMeal = () => {
    if (!program) return
    const num = program.meal_plan.length + 1
    setProgram({
      ...program,
      meal_plan: [...program.meal_plan, { meal: `Meal ${num}`, description: '', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }],
    })
  }

  const removeMeal = (idx: number) => {
    if (!program) return
    setProgram({ ...program, meal_plan: program.meal_plan.filter((_, i) => i !== idx) })
  }

  const updateSupplement = (idx: number, field: string, value: string) => {
    if (!program) return
    const s = [...program.current_supplements]
    s[idx] = { ...s[idx], [field]: value }
    setProgram({ ...program, current_supplements: s })
  }

  const addSupplement = () => {
    if (!program) return
    setProgram({
      ...program,
      current_supplements: [...program.current_supplements, { name: '', dose: '', frequency: 'Daily' }],
    })
  }

  const removeSupplement = (idx: number) => {
    if (!program) return
    setProgram({ ...program, current_supplements: program.current_supplements.filter((_, i) => i !== idx) })
  }

  const updatePeptide = (idx: number, field: string, value: string) => {
    if (!program) return
    const p = [...program.current_peptides]
    p[idx] = { ...p[idx], [field]: value }
    setProgram({ ...program, current_peptides: p })
  }

  const addPeptide = () => {
    if (!program) return
    setProgram({
      ...program,
      current_peptides: [...program.current_peptides, { name: '', dose: '', frequency: 'Daily', timing: 'Morning, SubQ injection' }],
    })
  }

  const removePeptide = (idx: number) => {
    if (!program) return
    setProgram({ ...program, current_peptides: program.current_peptides.filter((_, i) => i !== idx) })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF6A00]" />
      </div>
    )
  }

  if (!review || !program) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 text-lg">Program review not found or has no generated program.</p>
        <button onClick={() => router.push('/program-review')} className="mt-4 text-[#FF6A00] hover:underline">
          Back to reviews
        </button>
      </div>
    )
  }

  const status = review.status as string
  const isEditable = status === 'pending_review' || status === 'error'
  const clientName = client ? `${client.first_name} ${client.last_name}` : 'Unknown'

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'targets', label: 'Targets' },
    { id: 'workout', label: 'Workout' },
    { id: 'meals', label: 'Meals' },
    { id: 'supplements', label: 'Supplements' },
    { id: 'peptides', label: 'Peptides' },
    { id: 'cardio', label: 'Cardio' },
    { id: 'medical', label: 'Medical' },
    { id: 'raw', label: 'Raw Text' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push('/program-review')} className="text-[#555] hover:text-[#888] text-sm mb-2 block">
            &larr; Back to reviews
          </button>
          <h2 className="text-2xl font-bold text-white">Program Review: {clientName}</h2>
          <p className="text-sm text-[#888] mt-1">{program.program_name}</p>
        </div>
        <div className="flex items-center gap-3">
          {isEditable && (
            <>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="px-4 py-2 bg-[#2a2a2a] text-[#888] border border-[#2a2a2a] rounded-lg hover:text-white hover:border-[#555] transition-colors text-sm font-medium disabled:opacity-50"
              >
                {regenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#141414] text-[#FF6A00] border border-[#FF6A00]/30 rounded-lg hover:bg-[#FF6A00]/10 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="px-5 py-2 bg-[#FF6A00] text-white rounded-lg hover:bg-[#e55f00] transition-colors text-sm font-bold disabled:opacity-50"
              >
                {approving ? 'Approving...' : 'Approve & Send'}
              </button>
            </>
          )}
          {status === 'approved' && (
            <span className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm font-semibold">
              Approved
            </span>
          )}
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          message.type === 'success'
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-[#FF6A00] text-white'
                : 'bg-[#141414] text-[#888] border border-[#2a2a2a] hover:border-[#FF6A00]/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">

        {/* Overview — client intake summary */}
        {activeTab === 'overview' && intake && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Client Info">
              <InfoRow label="Name" value={clientName} />
              <InfoRow label="Email" value={client?.email as string} />
              <InfoRow label="Phone" value={intake.phone as string} />
              <InfoRow label="DOB" value={intake.date_of_birth as string} />
              <InfoRow label="Height" value={intake.height_inches ? `${Math.floor((intake.height_inches as number) / 12)}'${(intake.height_inches as number) % 12}"` : null} />
              <InfoRow label="Current Weight" value={intake.current_weight_lbs ? `${intake.current_weight_lbs} lbs` : null} />
              <InfoRow label="Goal Weight" value={intake.goal_weight_lbs ? `${intake.goal_weight_lbs} lbs` : null} />
            </Card>
            <Card title="Goals & Training">
              <InfoRow label="Primary Goals" value={intake.primary_goals as string} />
              <InfoRow label="Training Experience" value={intake.training_experience as string} />
              <InfoRow label="Previous Coaches" value={intake.previous_coaches as string} />
            </Card>
            <Card title="Medical">
              <InfoRow label="Conditions" value={intake.medical_conditions as string} />
              <InfoRow label="Medications" value={intake.current_medications as string} />
              <InfoRow label="Injuries/Limitations" value={intake.injuries_or_limitations as string} />
              <InfoRow label="Allergies" value={intake.allergies as string} />
            </Card>
            <Card title="Nutrition">
              <InfoRow label="Dietary Restrictions" value={intake.dietary_restrictions as string} />
            </Card>
          </div>
        )}

        {/* Daily Targets */}
        {activeTab === 'targets' && (
          <Card title="Daily Targets">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <NumberInput label="Calories" value={program.target_calories} onChange={v => updateField('target_calories', v)} disabled={!isEditable} />
              <NumberInput label="Protein (g)" value={program.target_protein} onChange={v => updateField('target_protein', v)} disabled={!isEditable} />
              <NumberInput label="Carbs (g)" value={program.target_carbs} onChange={v => updateField('target_carbs', v)} disabled={!isEditable} />
              <NumberInput label="Fats (g)" value={program.target_fats} onChange={v => updateField('target_fats', v)} disabled={!isEditable} />
              <NumberInput label="Steps" value={program.target_steps} onChange={v => updateField('target_steps', v)} disabled={!isEditable} />
              <NumberInput label="Water (oz)" value={program.target_water_oz} onChange={v => updateField('target_water_oz', v)} disabled={!isEditable} />
              <div>
                <label className="block text-xs text-[#555] mb-1">Weigh-in Day</label>
                <select
                  value={program.weigh_in_day}
                  onChange={e => updateField('weigh_in_day', e.target.value)}
                  disabled={!isEditable}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
                >
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(d => (
                    <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
              <p className="text-xs text-[#555]">Macro Total: {program.target_protein * 4 + program.target_carbs * 4 + program.target_fats * 9} kcal from macros vs {program.target_calories} target</p>
            </div>
          </Card>
        )}

        {/* Workout Program */}
        {activeTab === 'workout' && (
          <div className="space-y-4">
            {program.workout_program.map((day, dayIdx) => (
              <Card key={dayIdx} title={`${day.day}${day.name ? ` — ${day.name}` : ''}`}>
                <div className="flex gap-3 mb-4">
                  <input
                    value={day.day}
                    onChange={e => {
                      const wp = [...program.workout_program]
                      wp[dayIdx] = { ...wp[dayIdx], day: e.target.value }
                      setProgram({ ...program, workout_program: wp })
                    }}
                    disabled={!isEditable}
                    className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-sm w-24 disabled:opacity-50"
                    placeholder="Day"
                  />
                  <input
                    value={day.name || ''}
                    onChange={e => {
                      const wp = [...program.workout_program]
                      wp[dayIdx] = { ...wp[dayIdx], name: e.target.value }
                      setProgram({ ...program, workout_program: wp })
                    }}
                    disabled={!isEditable}
                    className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-sm flex-1 disabled:opacity-50"
                    placeholder="Day Name (e.g., Upper Body Push)"
                  />
                  {isEditable && (
                    <button onClick={() => removeWorkoutDay(dayIdx)} className="text-red-400 hover:text-red-300 text-sm px-2">
                      Remove
                    </button>
                  )}
                </div>

                {/* Exercise table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[#555] text-xs uppercase">
                        <th className="text-left py-2 pr-2">Exercise</th>
                        <th className="text-left py-2 pr-2 w-16">Sets</th>
                        <th className="text-left py-2 pr-2 w-20">Reps</th>
                        <th className="text-left py-2 pr-2 w-16">Rest</th>
                        <th className="text-left py-2 pr-2">Notes</th>
                        {isEditable && <th className="w-8" />}
                      </tr>
                    </thead>
                    <tbody>
                      {day.exercises.map((ex, exIdx) => (
                        <tr key={exIdx} className="border-t border-[#1a1a1a]">
                          <td className="py-2 pr-2">
                            <input value={ex.name} onChange={e => updateExercise(dayIdx, exIdx, 'name', e.target.value)} disabled={!isEditable}
                              className="w-full bg-transparent text-white disabled:opacity-70 focus:bg-[#0a0a0a] focus:border focus:border-[#FF6A00]/30 rounded px-1 py-0.5" />
                          </td>
                          <td className="py-2 pr-2">
                            <input value={String(ex.sets)} onChange={e => updateExercise(dayIdx, exIdx, 'sets', e.target.value)} disabled={!isEditable}
                              className="w-full bg-transparent text-white disabled:opacity-70 focus:bg-[#0a0a0a] rounded px-1 py-0.5" />
                          </td>
                          <td className="py-2 pr-2">
                            <input value={ex.reps} onChange={e => updateExercise(dayIdx, exIdx, 'reps', e.target.value)} disabled={!isEditable}
                              className="w-full bg-transparent text-white disabled:opacity-70 focus:bg-[#0a0a0a] rounded px-1 py-0.5" />
                          </td>
                          <td className="py-2 pr-2">
                            <input value={ex.rest || ''} onChange={e => updateExercise(dayIdx, exIdx, 'rest', e.target.value)} disabled={!isEditable}
                              className="w-full bg-transparent text-[#888] disabled:opacity-70 focus:bg-[#0a0a0a] rounded px-1 py-0.5" />
                          </td>
                          <td className="py-2 pr-2">
                            <input value={ex.notes || ''} onChange={e => updateExercise(dayIdx, exIdx, 'notes', e.target.value)} disabled={!isEditable}
                              className="w-full bg-transparent text-[#666] disabled:opacity-70 focus:bg-[#0a0a0a] rounded px-1 py-0.5" />
                          </td>
                          {isEditable && (
                            <td>
                              <button onClick={() => removeExercise(dayIdx, exIdx)} className="text-red-400/50 hover:text-red-400 text-xs">X</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {isEditable && (
                  <button onClick={() => addExercise(dayIdx)} className="mt-2 text-[#FF6A00] text-sm hover:underline">
                    + Add Exercise
                  </button>
                )}
              </Card>
            ))}
            {isEditable && (
              <button onClick={addWorkoutDay} className="w-full py-3 border border-dashed border-[#2a2a2a] rounded-xl text-[#FF6A00] hover:border-[#FF6A00]/50 text-sm font-medium">
                + Add Training Day
              </button>
            )}
          </div>
        )}

        {/* Meal Plan */}
        {activeTab === 'meals' && (
          <div className="space-y-4">
            {program.meal_plan.map((meal, idx) => (
              <Card key={idx} title={meal.meal}>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-[#555] mb-1">Meal Name</label>
                      <input value={meal.meal} onChange={e => updateMeal(idx, 'meal', e.target.value)} disabled={!isEditable}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
                    </div>
                    <div className="w-28">
                      <label className="block text-xs text-[#555] mb-1">Time</label>
                      <input value={meal.time || ''} onChange={e => updateMeal(idx, 'time', e.target.value)} disabled={!isEditable}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
                    </div>
                    {isEditable && (
                      <button onClick={() => removeMeal(idx)} className="self-end text-red-400 hover:text-red-300 text-sm px-2 py-2">
                        Remove
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-[#555] mb-1">Description</label>
                    <textarea value={meal.description} onChange={e => updateMeal(idx, 'description', e.target.value)} disabled={!isEditable}
                      rows={2} className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50 resize-none" />
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <NumberInput label="Calories" value={meal.calories || 0} onChange={v => updateMeal(idx, 'calories', v)} disabled={!isEditable} />
                    <NumberInput label="Protein" value={meal.protein_g || 0} onChange={v => updateMeal(idx, 'protein_g', v)} disabled={!isEditable} />
                    <NumberInput label="Carbs" value={meal.carbs_g || 0} onChange={v => updateMeal(idx, 'carbs_g', v)} disabled={!isEditable} />
                    <NumberInput label="Fats" value={meal.fat_g || 0} onChange={v => updateMeal(idx, 'fat_g', v)} disabled={!isEditable} />
                  </div>
                </div>
              </Card>
            ))}
            {isEditable && (
              <button onClick={addMeal} className="w-full py-3 border border-dashed border-[#2a2a2a] rounded-xl text-[#FF6A00] hover:border-[#FF6A00]/50 text-sm font-medium">
                + Add Meal
              </button>
            )}
            {/* Meal totals */}
            <Card title="Daily Totals">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-[#FF6A00] text-lg font-bold">{program.meal_plan.reduce((s, m) => s + (m.calories || 0), 0)}</div>
                  <div className="text-[#555] text-xs">Calories</div>
                </div>
                <div className="text-center">
                  <div className="text-[#FF6A00] text-lg font-bold">{program.meal_plan.reduce((s, m) => s + (m.protein_g || 0), 0)}g</div>
                  <div className="text-[#555] text-xs">Protein</div>
                </div>
                <div className="text-center">
                  <div className="text-[#FF6A00] text-lg font-bold">{program.meal_plan.reduce((s, m) => s + (m.carbs_g || 0), 0)}g</div>
                  <div className="text-[#555] text-xs">Carbs</div>
                </div>
                <div className="text-center">
                  <div className="text-[#FF6A00] text-lg font-bold">{program.meal_plan.reduce((s, m) => s + (m.fat_g || 0), 0)}g</div>
                  <div className="text-[#555] text-xs">Fats</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Supplements */}
        {activeTab === 'supplements' && (
          <Card title="Supplement Protocol">
            <div className="space-y-3">
              {program.current_supplements.map((supp, idx) => (
                <div key={idx} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-[#555] mb-1">Name</label>
                    <input value={supp.name} onChange={e => updateSupplement(idx, 'name', e.target.value)} disabled={!isEditable}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs text-[#555] mb-1">Dose</label>
                    <input value={supp.dose} onChange={e => updateSupplement(idx, 'dose', e.target.value)} disabled={!isEditable}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs text-[#555] mb-1">Frequency</label>
                    <input value={supp.frequency} onChange={e => updateSupplement(idx, 'frequency', e.target.value)} disabled={!isEditable}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
                  </div>
                  {isEditable && (
                    <button onClick={() => removeSupplement(idx)} className="text-red-400 hover:text-red-300 text-sm px-2 py-2">X</button>
                  )}
                </div>
              ))}
            </div>
            {isEditable && (
              <button onClick={addSupplement} className="mt-3 text-[#FF6A00] text-sm hover:underline">+ Add Supplement</button>
            )}
          </Card>
        )}

        {/* Peptides */}
        {activeTab === 'peptides' && (
          <Card title="Peptide Protocol">
            {program.current_peptides.length === 0 ? (
              <p className="text-[#555] text-sm">No peptides in this program.</p>
            ) : (
              <div className="space-y-3">
                {program.current_peptides.map((pep, idx) => (
                  <div key={idx} className="flex gap-3 items-end flex-wrap">
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs text-[#555] mb-1">Name</label>
                      <input value={pep.name} onChange={e => updatePeptide(idx, 'name', e.target.value)} disabled={!isEditable}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
                    </div>
                    <div className="w-28">
                      <label className="block text-xs text-[#555] mb-1">Dose</label>
                      <input value={pep.dose} onChange={e => updatePeptide(idx, 'dose', e.target.value)} disabled={!isEditable}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
                    </div>
                    <div className="w-28">
                      <label className="block text-xs text-[#555] mb-1">Frequency</label>
                      <input value={pep.frequency} onChange={e => updatePeptide(idx, 'frequency', e.target.value)} disabled={!isEditable}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <label className="block text-xs text-[#555] mb-1">Timing (SubQ ONLY)</label>
                      <input value={pep.timing} onChange={e => updatePeptide(idx, 'timing', e.target.value)} disabled={!isEditable}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
                    </div>
                    {isEditable && (
                      <button onClick={() => removePeptide(idx)} className="text-red-400 hover:text-red-300 text-sm px-2 py-2">X</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {isEditable && (
              <button onClick={addPeptide} className="mt-3 text-[#FF6A00] text-sm hover:underline">+ Add Peptide</button>
            )}
            <p className="mt-4 text-xs text-[#D4A017]">All peptides must use SubQ injection delivery. Nasal spray is never recommended.</p>
          </Card>
        )}

        {/* Cardio */}
        {activeTab === 'cardio' && (
          <Card title="Cardio Protocol">
            <div className="space-y-3">
              {program.cardio_protocol.map((c, idx) => (
                <div key={idx} className="flex gap-3 items-end flex-wrap">
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs text-[#555] mb-1">Phase</label>
                    <input value={c.phase} onChange={e => {
                      const cp = [...program.cardio_protocol]; cp[idx] = { ...cp[idx], phase: e.target.value }
                      setProgram({ ...program, cardio_protocol: cp })
                    }} disabled={!isEditable}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs text-[#555] mb-1">Duration</label>
                    <input value={c.duration} onChange={e => {
                      const cp = [...program.cardio_protocol]; cp[idx] = { ...cp[idx], duration: e.target.value }
                      setProgram({ ...program, cardio_protocol: cp })
                    }} disabled={!isEditable}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
                  </div>
                  {isEditable && (
                    <button onClick={() => {
                      setProgram({ ...program, cardio_protocol: program.cardio_protocol.filter((_, i) => i !== idx) })
                    }} className="text-red-400 hover:text-red-300 text-sm px-2 py-2">X</button>
                  )}
                </div>
              ))}
            </div>
            {isEditable && (
              <button onClick={() => setProgram({ ...program, cardio_protocol: [...program.cardio_protocol, { phase: '', duration: '' }] })}
                className="mt-3 text-[#FF6A00] text-sm hover:underline">+ Add Cardio Phase</button>
            )}
          </Card>
        )}

        {/* Medical */}
        {activeTab === 'medical' && (
          <Card title="Medical Protocol">
            <div className="space-y-3">
              {program.medical_protocol.map((m, idx) => (
                <div key={idx} className="flex gap-3 items-end flex-wrap">
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs text-[#555] mb-1">Name</label>
                    <input value={m.name} onChange={e => {
                      const mp = [...program.medical_protocol]; mp[idx] = { ...mp[idx], name: e.target.value }
                      setProgram({ ...program, medical_protocol: mp })
                    }} disabled={!isEditable}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs text-[#555] mb-1">Dose</label>
                    <input value={m.dose} onChange={e => {
                      const mp = [...program.medical_protocol]; mp[idx] = { ...mp[idx], dose: e.target.value }
                      setProgram({ ...program, medical_protocol: mp })
                    }} disabled={!isEditable}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs text-[#555] mb-1">Frequency</label>
                    <input value={m.frequency} onChange={e => {
                      const mp = [...program.medical_protocol]; mp[idx] = { ...mp[idx], frequency: e.target.value }
                      setProgram({ ...program, medical_protocol: mp })
                    }} disabled={!isEditable}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs text-[#555] mb-1">Notes</label>
                    <input value={m.notes} onChange={e => {
                      const mp = [...program.medical_protocol]; mp[idx] = { ...mp[idx], notes: e.target.value }
                      setProgram({ ...program, medical_protocol: mp })
                    }} disabled={!isEditable}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50" />
                  </div>
                  {isEditable && (
                    <button onClick={() => {
                      setProgram({ ...program, medical_protocol: program.medical_protocol.filter((_, i) => i !== idx) })
                    }} className="text-red-400 hover:text-red-300 text-sm px-2 py-2">X</button>
                  )}
                </div>
              ))}
            </div>
            {isEditable && (
              <button onClick={() => setProgram({
                ...program,
                medical_protocol: [...program.medical_protocol, { name: '', dose: '', frequency: '', notes: '' }]
              })} className="mt-3 text-[#FF6A00] text-sm hover:underline">+ Add Protocol Item</button>
            )}
          </Card>
        )}

        {/* Raw Text */}
        {activeTab === 'raw' && (
          <Card title="Full Program Text">
            <textarea
              value={program.program_raw_text || ''}
              onChange={e => updateField('program_raw_text', e.target.value)}
              disabled={!isEditable}
              rows={30}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm font-mono disabled:opacity-50 resize-y"
            />
          </Card>
        )}
      </div>
    </div>
  )
}

// Reusable components

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-[#888] mb-4 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex gap-4 py-1.5 border-b border-[#1a1a1a] last:border-0">
      <span className="text-xs text-[#555] w-36 flex-shrink-0">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  )
}

function NumberInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  disabled: boolean
}) {
  return (
    <div>
      <label className="block text-xs text-[#555] mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        disabled={disabled}
        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
      />
    </div>
  )
}

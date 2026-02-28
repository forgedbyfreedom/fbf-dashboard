'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface Exercise {
  name: string
  sets: string
  reps: string
}

interface WorkoutDay {
  day: string
  exercises: Exercise[]
}

interface CardioPhase {
  phase: string
  duration: string
  frequency: string
  notes: string
}

interface Meal {
  meal: string
  description: string
}

interface MedicalItem {
  name: string
  dose: string
  frequency: string
  notes: string
}

interface SupplementItem {
  name: string
  dose: string
  frequency: string
  [key: string]: string
}

interface PEDItem {
  compound: string
  dose: string
  frequency: string
  route: string
  [key: string]: string
}

interface PeptideItem {
  name: string
  dose: string
  frequency: string
  timing: string
  [key: string]: string
}

interface ProgramEditorProps {
  clientId: string
  programName?: string
  targetCalories?: number | null
  targetProtein?: number | null
  targetCarbs?: number | null
  targetFats?: number | null
  targetWaterOz?: number | null
  targetSteps?: number | null
  weigh_in_day?: string
  workoutProgram?: WorkoutDay[]
  cardioProtocol?: CardioPhase[]
  mealPlan?: Meal[]
  medicalProtocol?: MedicalItem[]
  currentSupplements?: SupplementItem[]
  currentPeds?: PEDItem[]
  currentPeptides?: PeptideItem[]
  onSaved: () => void
}

const inputClass = 'w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-[#555] focus:border-[#FF6A00] focus:outline-none'
const smallInputClass = 'px-2 py-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white text-xs placeholder-[#555] focus:border-[#FF6A00] focus:outline-none'

export default function ProgramEditor({
  clientId,
  programName = '',
  targetCalories,
  targetProtein,
  targetCarbs,
  targetFats,
  targetWaterOz,
  targetSteps,
  weigh_in_day = 'monday',
  workoutProgram = [],
  cardioProtocol = [],
  mealPlan = [],
  medicalProtocol = [],
  currentSupplements = [],
  currentPeds = [],
  currentPeptides = [],
  onSaved,
}: ProgramEditorProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingSection, setEditingSection] = useState<string | null>(null)

  // Editable state for each section
  const [name, setName] = useState(programName)
  const [calories, setCalories] = useState(targetCalories?.toString() || '')
  const [protein, setProtein] = useState(targetProtein?.toString() || '')
  const [carbs, setCarbs] = useState(targetCarbs?.toString() || '')
  const [fats, setFats] = useState(targetFats?.toString() || '')
  const [waterOz, setWaterOz] = useState(targetWaterOz?.toString() || '')
  const [steps, setSteps] = useState(targetSteps?.toString() || '')
  const [weighDay, setWeighDay] = useState(weigh_in_day)
  const [workouts, setWorkouts] = useState<WorkoutDay[]>(workoutProgram.length > 0 ? workoutProgram : [])
  const [cardio, setCardio] = useState<CardioPhase[]>(cardioProtocol.length > 0 ? cardioProtocol : [])
  const [meals, setMeals] = useState<Meal[]>(mealPlan.length > 0 ? mealPlan : [])
  const [medical, setMedical] = useState<MedicalItem[]>(medicalProtocol.length > 0 ? medicalProtocol : [])
  const [supplements, setSupplements] = useState<SupplementItem[]>(currentSupplements.length > 0 ? currentSupplements : [])
  const [peds, setPeds] = useState<PEDItem[]>(currentPeds.length > 0 ? currentPeds : [])
  const [peptides, setPeptides] = useState<PeptideItem[]>(currentPeptides.length > 0 ? currentPeptides : [])

  const saveSection = async (section: string, payload: Record<string, unknown>) => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/clients/program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, ...payload }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Save failed')
      }
      setEditingSection(null)
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const EditButton = ({ section }: { section: string }) => (
    <button
      onClick={() => setEditingSection(editingSection === section ? null : section)}
      className="text-xs text-[#FF6A00] hover:text-[#FF8533] transition-colors"
    >
      {editingSection === section ? 'Cancel' : 'Edit'}
    </button>
  )

  const SaveButton = ({ onClick }: { onClick: () => void }) => (
    <Button size="sm" onClick={onClick} disabled={saving}>
      {saving ? 'Saving...' : 'Save'}
    </Button>
  )

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      {/* ===== NUTRITION TARGETS ===== */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#D4A017]">Nutrition Targets & Info</h3>
          <EditButton section="nutrition" />
        </div>
        {editingSection === 'nutrition' ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#888] mb-1">Program Name</label>
              <input className={inputClass} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aggressive Cut Phase 1" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[#888] mb-1">Calories</label>
                <input className={inputClass} type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder="2200" />
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Protein (g)</label>
                <input className={inputClass} type="number" value={protein} onChange={e => setProtein(e.target.value)} placeholder="230" />
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Carbs (g)</label>
                <input className={inputClass} type="number" value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="200" />
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Fats (g)</label>
                <input className={inputClass} type="number" value={fats} onChange={e => setFats(e.target.value)} placeholder="60" />
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Water (oz)</label>
                <input className={inputClass} type="number" value={waterOz} onChange={e => setWaterOz(e.target.value)} placeholder="128" />
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Steps Target</label>
                <input className={inputClass} type="number" value={steps} onChange={e => setSteps(e.target.value)} placeholder="10000" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#888] mb-1">Weigh-in Day</label>
              <select className={inputClass} value={weighDay} onChange={e => setWeighDay(e.target.value)}>
                {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(d => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end pt-2">
              <SaveButton onClick={() => saveSection('nutrition', {
                program_name: name || null,
                target_calories: calories ? parseInt(calories) : null,
                target_protein: protein ? parseInt(protein) : null,
                target_carbs: carbs ? parseInt(carbs) : null,
                target_fats: fats ? parseInt(fats) : null,
                target_water_oz: waterOz ? parseInt(waterOz) : null,
                target_steps: steps ? parseInt(steps) : null,
                weigh_in_day: weighDay,
              })} />
            </div>
          </div>
        ) : (
          <div>
            {name && <p className="text-white font-medium mb-3">{name}</p>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#0a0a0a] rounded-lg p-2">
                <p className="text-xs text-[#555]">Calories</p>
                <p className="text-white font-bold text-sm">{calories || '—'}</p>
              </div>
              <div className="bg-[#0a0a0a] rounded-lg p-2">
                <p className="text-xs text-[#555]">Protein</p>
                <p className="text-white font-bold text-sm">{protein ? `${protein}g` : '—'}</p>
              </div>
              <div className="bg-[#0a0a0a] rounded-lg p-2">
                <p className="text-xs text-[#555]">Carbs</p>
                <p className="text-white font-bold text-sm">{carbs ? `${carbs}g` : '—'}</p>
              </div>
              <div className="bg-[#0a0a0a] rounded-lg p-2">
                <p className="text-xs text-[#555]">Fats</p>
                <p className="text-white font-bold text-sm">{fats ? `${fats}g` : '—'}</p>
              </div>
              <div className="bg-[#0a0a0a] rounded-lg p-2">
                <p className="text-xs text-[#555]">Water</p>
                <p className="text-white font-bold text-sm">{waterOz ? `${waterOz}oz` : '—'}</p>
              </div>
              <div className="bg-[#0a0a0a] rounded-lg p-2">
                <p className="text-xs text-[#555]">Steps</p>
                <p className="text-white font-bold text-sm">{steps ? parseInt(steps).toLocaleString() : '—'}</p>
              </div>
              <div className="bg-[#0a0a0a] rounded-lg p-2">
                <p className="text-xs text-[#555]">Weigh-in</p>
                <p className="text-white font-bold text-sm capitalize">{weighDay}</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ===== TRAINING SPLIT ===== */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#888]">Training Split</h3>
          <EditButton section="workouts" />
        </div>
        {editingSection === 'workouts' ? (
          <div className="space-y-4">
            {workouts.map((day, dayIdx) => (
              <div key={dayIdx} className="bg-[#0a0a0a] rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    className={`${smallInputClass} flex-1`}
                    value={day.day}
                    onChange={e => {
                      const updated = [...workouts]
                      updated[dayIdx] = { ...updated[dayIdx], day: e.target.value }
                      setWorkouts(updated)
                    }}
                    placeholder="Day 1 – Chest + Triceps"
                  />
                  <button
                    onClick={() => setWorkouts(workouts.filter((_, i) => i !== dayIdx))}
                    className="text-red-400 hover:text-red-300 text-xs px-2"
                  >
                    Remove Day
                  </button>
                </div>
                {day.exercises.map((ex, exIdx) => (
                  <div key={exIdx} className="flex items-center gap-2 ml-3">
                    <input
                      className={`${smallInputClass} flex-1`}
                      value={ex.name}
                      onChange={e => {
                        const updated = [...workouts]
                        updated[dayIdx].exercises[exIdx] = { ...ex, name: e.target.value }
                        setWorkouts(updated)
                      }}
                      placeholder="Exercise name"
                    />
                    <input
                      className={`${smallInputClass} w-16`}
                      value={ex.sets}
                      onChange={e => {
                        const updated = [...workouts]
                        updated[dayIdx].exercises[exIdx] = { ...ex, sets: e.target.value }
                        setWorkouts(updated)
                      }}
                      placeholder="Sets"
                    />
                    <span className="text-[#555] text-xs">x</span>
                    <input
                      className={`${smallInputClass} w-20`}
                      value={ex.reps}
                      onChange={e => {
                        const updated = [...workouts]
                        updated[dayIdx].exercises[exIdx] = { ...ex, reps: e.target.value }
                        setWorkouts(updated)
                      }}
                      placeholder="Reps"
                    />
                    <button
                      onClick={() => {
                        const updated = [...workouts]
                        updated[dayIdx].exercises = updated[dayIdx].exercises.filter((_, i) => i !== exIdx)
                        setWorkouts(updated)
                      }}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const updated = [...workouts]
                    updated[dayIdx].exercises = [...updated[dayIdx].exercises, { name: '', sets: '', reps: '' }]
                    setWorkouts(updated)
                  }}
                  className="text-xs text-[#FF6A00] hover:text-[#FF8533] ml-3"
                >
                  + Add Exercise
                </button>
              </div>
            ))}
            <button
              onClick={() => setWorkouts([...workouts, { day: '', exercises: [{ name: '', sets: '', reps: '' }] }])}
              className="text-xs text-[#FF6A00] hover:text-[#FF8533]"
            >
              + Add Training Day
            </button>
            <div className="flex justify-end pt-2">
              <SaveButton onClick={() => saveSection('workouts', { workout_program: workouts })} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.length > 0 ? workouts.map((day, i) => (
              <div key={i} className="bg-[#0a0a0a] rounded-lg p-3">
                <p className="text-sm text-[#FF6A00] font-medium mb-2">{day.day}</p>
                {day.exercises.map((ex, j) => (
                  <p key={j} className="text-xs text-[#ccc] ml-3 mb-0.5">
                    {ex.name} — <span className="text-[#888]">{ex.sets}x{ex.reps}</span>
                  </p>
                ))}
              </div>
            )) : (
              <p className="text-sm text-[#555]">No training program set</p>
            )}
          </div>
        )}
      </Card>

      {/* ===== CARDIO PROTOCOL ===== */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#888]">Cardio Protocol</h3>
          <EditButton section="cardio" />
        </div>
        {editingSection === 'cardio' ? (
          <div className="space-y-3">
            {cardio.map((phase, idx) => (
              <div key={idx} className="bg-[#0a0a0a] rounded-lg p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input className={smallInputClass} value={phase.phase} onChange={e => { const u = [...cardio]; u[idx] = { ...u[idx], phase: e.target.value }; setCardio(u) }} placeholder="Phase name" />
                  <input className={smallInputClass} value={phase.duration} onChange={e => { const u = [...cardio]; u[idx] = { ...u[idx], duration: e.target.value }; setCardio(u) }} placeholder="Duration" />
                  <input className={smallInputClass} value={phase.frequency} onChange={e => { const u = [...cardio]; u[idx] = { ...u[idx], frequency: e.target.value }; setCardio(u) }} placeholder="Frequency" />
                  <input className={smallInputClass} value={phase.notes} onChange={e => { const u = [...cardio]; u[idx] = { ...u[idx], notes: e.target.value }; setCardio(u) }} placeholder="Notes" />
                </div>
                <button onClick={() => setCardio(cardio.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
              </div>
            ))}
            <button onClick={() => setCardio([...cardio, { phase: '', duration: '', frequency: '', notes: '' }])} className="text-xs text-[#FF6A00] hover:text-[#FF8533]">+ Add Cardio Phase</button>
            <div className="flex justify-end pt-2">
              <SaveButton onClick={() => saveSection('cardio', { cardio_protocol: cardio })} />
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {cardio.length > 0 ? cardio.map((phase, i) => (
              <div key={i} className="bg-[#0a0a0a] rounded-lg p-2">
                <p className="text-xs text-white"><span className="text-[#FF6A00]">{phase.phase}:</span> {phase.duration} {phase.frequency && `— ${phase.frequency}`}</p>
                {phase.notes && <p className="text-xs text-[#555]">{phase.notes}</p>}
              </div>
            )) : (
              <p className="text-sm text-[#555]">No cardio protocol set</p>
            )}
          </div>
        )}
      </Card>

      {/* ===== MEAL PLAN ===== */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#888]">Meal Plan</h3>
          <EditButton section="meals" />
        </div>
        {editingSection === 'meals' ? (
          <div className="space-y-3">
            {meals.map((meal, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <input className={`${smallInputClass} w-24`} value={meal.meal} onChange={e => { const u = [...meals]; u[idx] = { ...u[idx], meal: e.target.value }; setMeals(u) }} placeholder="Meal 1" />
                <input className={`${smallInputClass} flex-1`} value={meal.description} onChange={e => { const u = [...meals]; u[idx] = { ...u[idx], description: e.target.value }; setMeals(u) }} placeholder="8oz chicken, 1 cup rice, veggies..." />
                <button onClick={() => setMeals(meals.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 text-xs mt-1">×</button>
              </div>
            ))}
            <button onClick={() => setMeals([...meals, { meal: `Meal ${meals.length + 1}`, description: '' }])} className="text-xs text-[#FF6A00] hover:text-[#FF8533]">+ Add Meal</button>
            <div className="flex justify-end pt-2">
              <SaveButton onClick={() => saveSection('meals', { meal_plan: meals })} />
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {meals.length > 0 ? meals.map((meal, i) => (
              <div key={i} className="bg-[#0a0a0a] rounded-lg p-2">
                <p className="text-xs"><span className="text-[#D4A017]">{meal.meal}:</span> <span className="text-[#ccc]">{meal.description}</span></p>
              </div>
            )) : (
              <p className="text-sm text-[#555]">No meal plan set</p>
            )}
          </div>
        )}
      </Card>

      {/* ===== SUPPLEMENTS ===== */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#D4A017]">Supplements</h3>
          <EditButton section="supplements" />
        </div>
        {editingSection === 'supplements' ? (
          <div className="space-y-3">
            {supplements.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input className={`${smallInputClass} flex-1`} value={s.name} onChange={e => { const u = [...supplements]; u[idx] = { ...u[idx], name: e.target.value }; setSupplements(u) }} placeholder="Supplement name" />
                <input className={`${smallInputClass} w-24`} value={s.dose} onChange={e => { const u = [...supplements]; u[idx] = { ...u[idx], dose: e.target.value }; setSupplements(u) }} placeholder="Dose" />
                <input className={`${smallInputClass} w-24`} value={s.frequency} onChange={e => { const u = [...supplements]; u[idx] = { ...u[idx], frequency: e.target.value }; setSupplements(u) }} placeholder="Frequency" />
                <button onClick={() => setSupplements(supplements.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 text-xs">×</button>
              </div>
            ))}
            <button onClick={() => setSupplements([...supplements, { name: '', dose: '', frequency: '' }])} className="text-xs text-[#FF6A00] hover:text-[#FF8533]">+ Add Supplement</button>
            <div className="flex justify-end pt-2">
              <SaveButton onClick={() => saveSection('supplements', { current_supplements: supplements })} />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {supplements.length > 0 ? supplements.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-[#0a0a0a] rounded-lg">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-white text-sm font-medium">{s.name}</span>
                <span className="text-[#888] text-xs">{s.dose}</span>
                <span className="text-[#555] text-xs ml-auto">{s.frequency}</span>
              </div>
            )) : (
              <p className="text-sm text-[#555]">No supplements assigned</p>
            )}
          </div>
        )}
      </Card>

      {/* ===== PED PROTOCOL ===== */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#D4A017]">PED Protocol</h3>
          <EditButton section="peds" />
        </div>
        {editingSection === 'peds' ? (
          <div className="space-y-3">
            {peds.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input className={`${smallInputClass} flex-1`} value={p.compound} onChange={e => { const u = [...peds]; u[idx] = { ...u[idx], compound: e.target.value }; setPeds(u) }} placeholder="Compound" />
                <input className={`${smallInputClass} w-24`} value={p.dose} onChange={e => { const u = [...peds]; u[idx] = { ...u[idx], dose: e.target.value }; setPeds(u) }} placeholder="Dose" />
                <input className={`${smallInputClass} w-24`} value={p.frequency} onChange={e => { const u = [...peds]; u[idx] = { ...u[idx], frequency: e.target.value }; setPeds(u) }} placeholder="Frequency" />
                <input className={`${smallInputClass} w-20`} value={p.route} onChange={e => { const u = [...peds]; u[idx] = { ...u[idx], route: e.target.value }; setPeds(u) }} placeholder="Route" />
                <button onClick={() => setPeds(peds.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 text-xs">×</button>
              </div>
            ))}
            <button onClick={() => setPeds([...peds, { compound: '', dose: '', frequency: '', route: '' }])} className="text-xs text-[#FF6A00] hover:text-[#FF8533]">+ Add Compound</button>
            <div className="flex justify-end pt-2">
              <SaveButton onClick={() => saveSection('peds', { current_peds: peds })} />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {peds.length > 0 ? peds.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-[#0a0a0a] rounded-lg">
                <div className="w-2 h-2 rounded-full bg-[#FF6A00]" />
                <span className="text-white text-sm font-medium">{p.compound}</span>
                <span className="text-[#888] text-xs">{p.dose}</span>
                <span className="text-[#555] text-xs">{p.route}</span>
                <span className="text-[#555] text-xs ml-auto">{p.frequency}</span>
              </div>
            )) : (
              <p className="text-sm text-[#555]">No PEDs assigned</p>
            )}
          </div>
        )}
      </Card>

      {/* ===== PEPTIDE PROTOCOL ===== */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#D4A017]">Peptide Protocol</h3>
          <EditButton section="peptides" />
        </div>
        {editingSection === 'peptides' ? (
          <div className="space-y-3">
            {peptides.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input className={`${smallInputClass} flex-1`} value={p.name} onChange={e => { const u = [...peptides]; u[idx] = { ...u[idx], name: e.target.value }; setPeptides(u) }} placeholder="Peptide name" />
                <input className={`${smallInputClass} w-24`} value={p.dose} onChange={e => { const u = [...peptides]; u[idx] = { ...u[idx], dose: e.target.value }; setPeptides(u) }} placeholder="Dose" />
                <input className={`${smallInputClass} w-24`} value={p.frequency} onChange={e => { const u = [...peptides]; u[idx] = { ...u[idx], frequency: e.target.value }; setPeptides(u) }} placeholder="Frequency" />
                <input className={`${smallInputClass} w-24`} value={p.timing} onChange={e => { const u = [...peptides]; u[idx] = { ...u[idx], timing: e.target.value }; setPeptides(u) }} placeholder="Timing" />
                <button onClick={() => setPeptides(peptides.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 text-xs">×</button>
              </div>
            ))}
            <button onClick={() => setPeptides([...peptides, { name: '', dose: '', frequency: '', timing: '' }])} className="text-xs text-[#FF6A00] hover:text-[#FF8533]">+ Add Peptide</button>
            <div className="flex justify-end pt-2">
              <SaveButton onClick={() => saveSection('peptides', { current_peptides: peptides })} />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {peptides.length > 0 ? peptides.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-[#0a0a0a] rounded-lg">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-white text-sm font-medium">{p.name}</span>
                <span className="text-[#888] text-xs">{p.dose}</span>
                <span className="text-[#555] text-xs">{p.timing}</span>
                <span className="text-[#555] text-xs ml-auto">{p.frequency}</span>
              </div>
            )) : (
              <p className="text-sm text-[#555]">No peptides assigned</p>
            )}
          </div>
        )}
      </Card>

      {/* ===== MEDICAL PROTOCOL ===== */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#888]">Medical Protocol (GLP-1, Retatrutide, etc.)</h3>
          <EditButton section="medical" />
        </div>
        {editingSection === 'medical' ? (
          <div className="space-y-3">
            {medical.map((m, idx) => (
              <div key={idx} className="bg-[#0a0a0a] rounded-lg p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input className={smallInputClass} value={m.name} onChange={e => { const u = [...medical]; u[idx] = { ...u[idx], name: e.target.value }; setMedical(u) }} placeholder="Compound name" />
                  <input className={smallInputClass} value={m.dose} onChange={e => { const u = [...medical]; u[idx] = { ...u[idx], dose: e.target.value }; setMedical(u) }} placeholder="Dose" />
                  <input className={smallInputClass} value={m.frequency} onChange={e => { const u = [...medical]; u[idx] = { ...u[idx], frequency: e.target.value }; setMedical(u) }} placeholder="Frequency" />
                  <input className={smallInputClass} value={m.notes} onChange={e => { const u = [...medical]; u[idx] = { ...u[idx], notes: e.target.value }; setMedical(u) }} placeholder="Notes" />
                </div>
                <button onClick={() => setMedical(medical.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
              </div>
            ))}
            <button onClick={() => setMedical([...medical, { name: '', dose: '', frequency: '', notes: '' }])} className="text-xs text-[#FF6A00] hover:text-[#FF8533]">+ Add Medical Compound</button>
            <div className="flex justify-end pt-2">
              <SaveButton onClick={() => saveSection('medical', { medical_protocol: medical })} />
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {medical.length > 0 ? medical.map((m, i) => (
              <div key={i} className="bg-[#0a0a0a] rounded-lg p-2">
                <p className="text-xs text-white font-medium">{m.name}</p>
                <p className="text-xs text-[#888]">{m.dose} — {m.frequency}</p>
                {m.notes && <p className="text-xs text-[#555]">{m.notes}</p>}
              </div>
            )) : (
              <p className="text-sm text-[#555]">No medical protocol set</p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

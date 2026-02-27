'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { parseProgram } from '@/lib/programParser'

interface ProgramImportProps {
  clientId: string
  onImported: () => void
}

export default function ProgramImport({ clientId, onImported }: ProgramImportProps) {
  const [rawText, setRawText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<ReturnType<typeof parseProgram> | null>(null)

  const handleParse = () => {
    if (!rawText.trim()) return
    const parsed = parseProgram(rawText)
    setPreview(parsed)
  }

  const handleImport = async () => {
    if (!preview) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/clients/program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          program_name: preview.programName,
          program_raw_text: rawText,
          target_calories: preview.targetCalories,
          target_protein: preview.targetProtein,
          target_carbs: preview.targetCarbs,
          target_fats: preview.targetFats,
          target_water_oz: preview.targetWaterOz,
          workout_program: preview.workoutProgram,
          cardio_protocol: preview.cardioProtocol,
          meal_plan: preview.mealPlan,
          current_supplements: preview.supplements,
          medical_protocol: preview.medicalProtocol,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to import')
      onImported()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {!preview ? (
        <>
          <Card>
            <h3 className="text-sm font-semibold text-[#D4A017] mb-3">Import FBF Program</h3>
            <p className="text-xs text-[#555] mb-3">
              Paste the full program text below. Exercises, nutrition targets, supplements, and medical protocols will be auto-parsed.
            </p>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-white text-sm placeholder-[#555] min-h-[200px] font-mono"
              placeholder="Paste your FBF program document here..."
            />
            <div className="mt-3">
              <Button onClick={handleParse} disabled={!rawText.trim()}>
                Parse Program
              </Button>
            </div>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#D4A017]">Program Preview</h3>
              <button onClick={() => setPreview(null)} className="text-xs text-[#888] hover:text-white">
                ← Edit Text
              </button>
            </div>

            {preview.programName && (
              <p className="text-white font-medium mb-3">Phase: {preview.programName}</p>
            )}

            {/* Nutrition Targets */}
            <div className="mb-4">
              <p className="text-xs text-[#888] font-semibold mb-2 uppercase tracking-wider">Nutrition Targets</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-[#0a0a0a] rounded-lg p-2">
                  <p className="text-xs text-[#555]">Calories</p>
                  <p className="text-white font-bold">{preview.targetCalories ?? '—'}</p>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg p-2">
                  <p className="text-xs text-[#555]">Protein</p>
                  <p className="text-white font-bold">{preview.targetProtein ? `${preview.targetProtein}g` : '—'}</p>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg p-2">
                  <p className="text-xs text-[#555]">Carbs</p>
                  <p className="text-white font-bold">{preview.targetCarbs ? `${preview.targetCarbs}g` : '—'}</p>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg p-2">
                  <p className="text-xs text-[#555]">Fats</p>
                  <p className="text-white font-bold">{preview.targetFats ? `${preview.targetFats}g` : '—'}</p>
                </div>
                <div className="bg-[#0a0a0a] rounded-lg p-2">
                  <p className="text-xs text-[#555]">Water</p>
                  <p className="text-white font-bold">{preview.targetWaterOz ? `${preview.targetWaterOz}oz` : '—'}</p>
                </div>
              </div>
            </div>

            {/* Training Program */}
            {preview.workoutProgram.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-[#888] font-semibold mb-2 uppercase tracking-wider">
                  Training ({preview.workoutProgram.length} days)
                </p>
                <div className="space-y-2">
                  {preview.workoutProgram.map((day, i) => (
                    <div key={i} className="bg-[#0a0a0a] rounded-lg p-3">
                      <p className="text-sm text-[#FF6A00] font-medium mb-1">{day.day}</p>
                      {day.exercises.map((ex, j) => (
                        <p key={j} className="text-xs text-[#ccc] ml-2">
                          {ex.name} — {ex.sets}x{ex.reps}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cardio */}
            {preview.cardioProtocol.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-[#888] font-semibold mb-2 uppercase tracking-wider">Cardio Protocol</p>
                {preview.cardioProtocol.map((phase, i) => (
                  <div key={i} className="bg-[#0a0a0a] rounded-lg p-2 mb-1">
                    <p className="text-xs text-white"><span className="text-[#FF6A00]">{phase.phase}:</span> {phase.duration}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Meal Plan */}
            {preview.mealPlan.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-[#888] font-semibold mb-2 uppercase tracking-wider">Meal Plan</p>
                {preview.mealPlan.map((meal, i) => (
                  <div key={i} className="bg-[#0a0a0a] rounded-lg p-2 mb-1">
                    <p className="text-xs"><span className="text-[#D4A017]">{meal.meal}:</span> <span className="text-[#ccc]">{meal.description}</span></p>
                  </div>
                ))}
              </div>
            )}

            {/* Supplements */}
            {preview.supplements.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-[#888] font-semibold mb-2 uppercase tracking-wider">
                  Supplements ({preview.supplements.length})
                </p>
                {preview.supplements.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#0a0a0a] rounded-lg p-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs text-white">{s.name}</span>
                    {s.dose && <span className="text-xs text-[#888]">{s.dose}</span>}
                    {s.frequency && <span className="text-xs text-[#555] ml-auto">{s.frequency}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Medical Protocol */}
            {preview.medicalProtocol.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-[#888] font-semibold mb-2 uppercase tracking-wider">Medical Protocol</p>
                {preview.medicalProtocol.map((m, i) => (
                  <div key={i} className="bg-[#0a0a0a] rounded-lg p-2 mb-1">
                    <p className="text-xs text-white font-medium">{m.name}</p>
                    <p className="text-xs text-[#888]">{m.dose} — {m.frequency}</p>
                    {m.notes && <p className="text-xs text-[#555]">{m.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleImport} disabled={saving} className="flex-1">
              {saving ? 'Importing...' : 'Import to Client Profile'}
            </Button>
            <Button variant="secondary" onClick={() => setPreview(null)}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

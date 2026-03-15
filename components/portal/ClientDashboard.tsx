'use client'

import { useState, useEffect } from 'react'
import TrendCharts from '@/components/dashboard/TrendCharts'
import BodyCompChart from '@/components/dashboard/BodyCompChart'
import Timeline from '@/components/dashboard/Timeline'
import Tabs from '@/components/ui/Tabs'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

interface Report {
  id: string
  report_type: string
  report_date: string
  pdf_url: string | null
  created_at: string
}

interface ClientDashboardProps {
  client: {
    id: string
    first_name: string
    last_name: string
    target_calories: number | null
    target_protein: number | null
    target_steps: number | null
    target_carbs?: number | null
    target_fats?: number | null
    target_water_oz?: number | null
    program_name?: string | null
    workout_program?: Array<{ day: string; exercises: Array<{ name: string; sets: string; reps: string }> }>
    cardio_protocol?: Array<{ phase: string; duration: string; frequency: string; notes: string }>
    meal_plan?: Array<{ meal: string; description: string }>
    current_supplements?: Array<{ [key: string]: string }>
  }
  checkins: Array<{
    id: string
    date: string
    weight_lbs: number | null
    sleep_hours: number | null
    sleep_quality: number | null
    steps: number | null
    calories: number | null
    protein_g: number | null
    carbs_g: number | null
    fat_g: number | null
    training_done: boolean
    training_type: string | null
    general_notes: string | null
    side_effects_notes: string | null
    mood_rating: number | null
    mood_notes: string | null
    body_temp: number | null
    water_oz: number | null
    stress_level: number | null
    cardio_minutes: number | null
    estimated_calories_burned: number | null
    supplement_compliance: boolean | null
    progress_photo_urls: string[] | null
  }>
  metrics: {
    adherence_7d: number | null
    avg_calories_7d: number | null
    avg_protein_7d: number | null
    avg_steps_7d: number | null
    avg_sleep_7d: number | null
    avg_mood_7d: number | null
    avg_stress_7d: number | null
    avg_water_7d: number | null
    supplement_compliance_7d: number | null
    weight_current: number | null
    weight_delta_7d: number | null
    weight_delta_30d: number | null
  } | null
  streak: {
    current_streak: number
    longest_streak: number
  } | null
  coachName: string
}

function ClientReports({ clientId }: { clientId: string }) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/reports/generate?client_id=${clientId}`)
      .then(r => r.ok ? r.json() : { reports: [] })
      .then(d => setReports(d.reports || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  if (loading) return <p className="text-sm text-[#555]">Loading reports...</p>

  if (reports.length === 0) {
    return (
      <Card>
        <p className="text-sm text-[#555] text-center py-6">
          No reports available yet. Your coach will generate progress reports for you.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {reports.map(report => (
        <Card key={report.id}>
          <div className="flex items-center justify-between">
            <div>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 ${
                report.report_type === 'weekly'
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-yellow-500/10 text-yellow-400'
              }`}>
                {report.report_type}
              </span>
              <span className="text-white font-medium text-sm">
                {new Date(report.report_date + 'T12:00:00').toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </span>
            </div>
            {report.pdf_url && (
              <div className="flex gap-3">
                <a href={report.pdf_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#FF6A00] hover:text-[#FF8533]">View PDF</a>
                <a href={report.pdf_url} download
                  className="text-xs text-[#888] hover:text-white">Download</a>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function ClientDashboard({ client, checkins, metrics, streak, coachName }: ClientDashboardProps) {
  const latest = checkins[0]

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'wellness', label: 'Wellness' },
    { id: 'trends', label: 'Trends' },
    { id: 'body-comp', label: 'Body Comp' },
    { id: 'program', label: 'My Program' },
    { id: 'history', label: 'History' },
    { id: 'photos', label: 'Photos' },
    { id: 'reports', label: 'Reports' },
  ]

  const hasPhotos = checkins.some(c => c.progress_photo_urls && c.progress_photo_urls.length > 0)

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-black text-white tracking-widest">FORGED BY FREEDOM</h1>
        <p className="text-xs text-[#D4A017] font-semibold tracking-[0.3em] uppercase mt-2">Strength &bull; Discipline &bull; Freedom</p>
      </div>

      {/* Welcome + Quick Stats */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">Welcome back, {client.first_name}</h2>
        <p className="text-sm text-[#888]">Coach: {coachName}</p>
      </div>

      {/* Quick stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <Card>
          <p className="text-xs text-[#555]">Weight</p>
          <p className="text-xl font-bold text-white">{metrics?.weight_current ?? '—'}</p>
          {metrics?.weight_delta_7d != null && (
            <p className={`text-xs ${metrics.weight_delta_7d > 0 ? 'text-red-400' : metrics.weight_delta_7d < 0 ? 'text-green-400' : 'text-[#555]'}`}>
              {metrics.weight_delta_7d > 0 ? '+' : ''}{metrics.weight_delta_7d} 7d
            </p>
          )}
        </Card>
        <Card>
          <p className="text-xs text-[#555]">Adherence</p>
          <p className="text-xl font-bold text-white">{metrics?.adherence_7d ?? 0}%</p>
          <p className="text-xs text-[#555]">7-day</p>
        </Card>
        <Card>
          <p className="text-xs text-[#555]">Streak</p>
          <p className="text-xl font-bold text-[#FF6A00]">{streak?.current_streak ?? 0}</p>
          <p className="text-xs text-[#555]">days</p>
        </Card>
        <Card>
          <p className="text-xs text-[#555]">Avg Calories</p>
          <p className="text-xl font-bold text-white">{metrics?.avg_calories_7d?.toFixed(0) ?? '—'}</p>
          {client.target_calories && <p className="text-xs text-[#555]">/ {client.target_calories}</p>}
        </Card>
        <Card>
          <p className="text-xs text-[#555]">Avg Protein</p>
          <p className="text-xl font-bold text-white">{metrics?.avg_protein_7d?.toFixed(0) ?? '—'}g</p>
          {client.target_protein && <p className="text-xs text-[#555]">/ {client.target_protein}g</p>}
        </Card>
        <Card>
          <p className="text-xs text-[#555]">Avg Sleep</p>
          <p className="text-xl font-bold text-white">{metrics?.avg_sleep_7d?.toFixed(1) ?? '—'}</p>
          <p className="text-xs text-[#555]">hours</p>
        </Card>
      </div>

      <Tabs tabs={tabs} defaultTab="overview">
        {(activeTab) => (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {latest ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Latest check-in snapshot */}
                    <Card>
                      <h3 className="text-sm font-semibold text-[#888] mb-4">
                        Latest Check-in — {new Date(latest.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-[#555]">Weight</p>
                          <p className="text-xl font-bold text-white">{latest.weight_lbs ?? '—'} <span className="text-sm text-[#555]">lbs</span></p>
                        </div>
                        <div>
                          <p className="text-xs text-[#555]">Sleep</p>
                          <p className="text-xl font-bold text-white">{latest.sleep_hours ?? '—'} <span className="text-sm text-[#555]">hrs</span></p>
                        </div>
                        <div>
                          <p className="text-xs text-[#555]">Steps</p>
                          <p className="text-xl font-bold text-white">{latest.steps?.toLocaleString() ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#555]">Cardio</p>
                          <p className="text-xl font-bold text-white">{latest.cardio_minutes ?? '—'} <span className="text-sm text-[#555]">min</span></p>
                        </div>
                      </div>
                    </Card>

                    {/* Nutrition */}
                    <Card>
                      <h3 className="text-sm font-semibold text-[#888] mb-4">Nutrition</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-[#555]">Calories</p>
                          <p className="text-xl font-bold text-white">{latest.calories ?? '—'}</p>
                          {client.target_calories && <p className="text-xs text-[#888]">Target: {client.target_calories}</p>}
                        </div>
                        <div>
                          <p className="text-xs text-[#555]">Protein</p>
                          <p className="text-xl font-bold text-white">{latest.protein_g ?? '—'}<span className="text-sm text-[#555]">g</span></p>
                          {client.target_protein && <p className="text-xs text-[#888]">Target: {client.target_protein}g</p>}
                        </div>
                        <div>
                          <p className="text-xs text-[#555]">Carbs</p>
                          <p className="text-xl font-bold text-white">{latest.carbs_g ?? '—'}<span className="text-sm text-[#555]">g</span></p>
                        </div>
                        <div>
                          <p className="text-xs text-[#555]">Fat</p>
                          <p className="text-xl font-bold text-white">{latest.fat_g ?? '—'}<span className="text-sm text-[#555]">g</span></p>
                        </div>
                      </div>
                    </Card>

                    {/* Wellness */}
                    <Card>
                      <h3 className="text-sm font-semibold text-[#888] mb-4">Wellness</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-[#555]">Mood</p>
                          <p className="text-xl font-bold text-white">{latest.mood_rating ?? '—'}<span className="text-sm text-[#555]">/10</span></p>
                        </div>
                        <div>
                          <p className="text-xs text-[#555]">Stress</p>
                          <p className="text-xl font-bold text-white">{latest.stress_level ?? '—'}<span className="text-sm text-[#555]">/10</span></p>
                        </div>
                        <div>
                          <p className="text-xs text-[#555]">Water</p>
                          <p className="text-xl font-bold text-white">{latest.water_oz ?? '—'} <span className="text-sm text-[#555]">oz</span></p>
                        </div>
                        <div>
                          <p className="text-xs text-[#555]">Body Temp</p>
                          <p className="text-xl font-bold text-white">{latest.body_temp ?? '—'}<span className="text-sm text-[#555]">°F</span></p>
                        </div>
                      </div>
                    </Card>

                    {/* Training */}
                    <Card>
                      <h3 className="text-sm font-semibold text-[#888] mb-4">Training</h3>
                      {latest.training_done ? (
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="green">{latest.training_type || 'Trained'}</Badge>
                            {latest.estimated_calories_burned && (
                              <span className="text-sm text-[#D4A017]">~{latest.estimated_calories_burned} cal burned</span>
                            )}
                          </div>
                          {latest.general_notes && <p className="text-sm text-[#ccc] mt-2">{latest.general_notes}</p>}
                        </div>
                      ) : (
                        <p className="text-sm text-[#555]">Rest day</p>
                      )}
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <p className="text-[#555] text-center py-12">No check-ins yet. Use your check-in link to get started!</p>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'wellness' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <p className="text-xs text-[#555] mb-1">Avg Mood (7d)</p>
                    <p className="text-2xl font-bold text-white">{metrics?.avg_mood_7d?.toFixed(1) ?? '—'}<span className="text-sm text-[#555]">/10</span></p>
                  </Card>
                  <Card>
                    <p className="text-xs text-[#555] mb-1">Avg Stress (7d)</p>
                    <p className="text-2xl font-bold text-white">{metrics?.avg_stress_7d?.toFixed(1) ?? '—'}<span className="text-sm text-[#555]">/10</span></p>
                  </Card>
                  <Card>
                    <p className="text-xs text-[#555] mb-1">Avg Water (7d)</p>
                    <p className="text-2xl font-bold text-white">{metrics?.avg_water_7d?.toFixed(0) ?? '—'} <span className="text-sm text-[#555]">oz</span></p>
                  </Card>
                  <Card>
                    <p className="text-xs text-[#555] mb-1">Supplement Compliance</p>
                    <p className="text-2xl font-bold text-white">{metrics?.supplement_compliance_7d != null ? `${Math.round(metrics.supplement_compliance_7d)}%` : '—'}</p>
                  </Card>
                </div>

                <Card>
                  <h3 className="text-sm font-semibold text-[#888] mb-4">Recent Wellness Entries</h3>
                  <div className="space-y-3">
                    {checkins.slice(0, 14).map(c => (
                      <div key={c.id} className="flex items-center gap-4 text-sm border-b border-[#1a1a1a] pb-2 last:border-0">
                        <span className="text-[#555] w-20 shrink-0">
                          {new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex gap-4 flex-wrap flex-1">
                          {c.mood_rating != null && (
                            <span className="text-white">Mood: <span className={c.mood_rating >= 7 ? 'text-green-400' : c.mood_rating >= 4 ? 'text-yellow-400' : 'text-red-400'}>{c.mood_rating}</span></span>
                          )}
                          {c.stress_level != null && (
                            <span className="text-white">Stress: <span className={c.stress_level <= 4 ? 'text-green-400' : c.stress_level <= 7 ? 'text-yellow-400' : 'text-red-400'}>{c.stress_level}</span></span>
                          )}
                          {c.water_oz != null && (
                            <span className="text-white">Water: <span className={c.water_oz >= 64 ? 'text-blue-400' : 'text-yellow-400'}>{c.water_oz}oz</span></span>
                          )}
                          {c.body_temp != null && (
                            <span className="text-white">Temp: {c.body_temp}°F</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'trends' && (
              <TrendCharts
                checkins={checkins}
                targetCalories={client.target_calories}
                targetProtein={client.target_protein}
                targetSteps={client.target_steps}
                targetWaterOz={client.target_water_oz}
              />
            )}

            {activeTab === 'body-comp' && (
              <BodyCompChart clientId={client.id} />
            )}

            {activeTab === 'program' && (
              <div className="space-y-4">
                {client.program_name && (
                  <Card>
                    <h3 className="text-lg font-bold text-[#FF6A00] mb-2">{client.program_name}</h3>
                    <p className="text-sm text-[#888]">Your current training program assigned by your coach.</p>
                  </Card>
                )}

                {/* Targets */}
                <Card>
                  <h3 className="text-sm font-semibold text-[#888] mb-4">Daily Targets</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-[#555]">Calories</p>
                      <p className="text-white font-bold text-lg">{client.target_calories || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[#555]">Protein</p>
                      <p className="text-white font-bold text-lg">{client.target_protein ? `${client.target_protein}g` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[#555]">Carbs</p>
                      <p className="text-white font-bold text-lg">{client.target_carbs ? `${client.target_carbs}g` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[#555]">Fats</p>
                      <p className="text-white font-bold text-lg">{client.target_fats ? `${client.target_fats}g` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[#555]">Steps</p>
                      <p className="text-white font-bold text-lg">{client.target_steps?.toLocaleString() || '—'}</p>
                    </div>
                  </div>
                </Card>

                {/* Workout Program */}
                {client.workout_program && client.workout_program.length > 0 && (
                  <Card>
                    <h3 className="text-sm font-semibold text-[#888] mb-4">Workout Program</h3>
                    <div className="space-y-4">
                      {client.workout_program.map((day, i) => (
                        <div key={i} className="border-b border-[#1a1a1a] pb-3 last:border-0 last:pb-0">
                          <p className="text-sm font-semibold text-[#FF6A00] mb-2">{day.day}</p>
                          <div className="space-y-1">
                            {day.exercises.map((ex, j) => (
                              <div key={j} className="flex justify-between text-sm">
                                <span className="text-[#ccc]">{ex.name}</span>
                                <span className="text-[#888]">{ex.sets} × {ex.reps}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Cardio */}
                {client.cardio_protocol && client.cardio_protocol.length > 0 && (
                  <Card>
                    <h3 className="text-sm font-semibold text-[#888] mb-4">Cardio Protocol</h3>
                    <div className="space-y-3">
                      {client.cardio_protocol.map((phase, i) => (
                        <div key={i} className="flex justify-between items-start text-sm border-b border-[#1a1a1a] pb-2 last:border-0">
                          <div>
                            <p className="text-white font-medium">{phase.phase}</p>
                            <p className="text-[#888]">{phase.frequency} — {phase.duration}</p>
                          </div>
                          {phase.notes && <p className="text-[#555] text-xs max-w-[200px] text-right">{phase.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Meal Plan */}
                {client.meal_plan && client.meal_plan.length > 0 && (
                  <Card>
                    <h3 className="text-sm font-semibold text-[#888] mb-4">Meal Plan</h3>
                    <div className="space-y-3">
                      {client.meal_plan.map((meal, i) => (
                        <div key={i} className="border-b border-[#1a1a1a] pb-2 last:border-0">
                          <p className="text-sm font-semibold text-[#D4A017]">{meal.meal}</p>
                          <p className="text-sm text-[#ccc]">{meal.description}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Disclaimer */}
                <div className="bg-[#FF6A00]/5 border border-[#FF6A00]/20 rounded-lg p-3 mb-4">
                  <p className="text-xs text-[#888] leading-relaxed text-center">
                    ⚠️ Program information is for educational purposes only. Not medical advice. No recommendations for human consumption are made or implied. Consult your physician before implementing any protocol changes.
                  </p>
                </div>

                {/* Supplements */}
                {client.current_supplements && client.current_supplements.length > 0 && (
                  <Card>
                    <h3 className="text-sm font-semibold text-[#888] mb-4">Supplements</h3>
                    <div className="space-y-2">
                      {client.current_supplements.map((supp, i) => (
                        <div key={i} className="flex justify-between text-sm border-b border-[#1a1a1a] pb-2 last:border-0">
                          <span className="text-white">{supp.name}</span>
                          <span className="text-[#888]">{supp.dose} — {supp.frequency}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {!client.workout_program?.length && !client.cardio_protocol?.length && !client.meal_plan?.length && (
                  <Card>
                    <p className="text-sm text-[#555] text-center py-6">
                      Your coach hasn&apos;t assigned a program yet. Check back soon!
                    </p>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'history' && <Timeline checkins={checkins} />}

            {activeTab === 'photos' && (
              <div className="space-y-4">
                {hasPhotos ? (
                  checkins
                    .filter(c => c.progress_photo_urls && c.progress_photo_urls.length > 0)
                    .map(c => (
                      <Card key={c.id}>
                        <p className="text-sm font-semibold text-[#888] mb-3">
                          {new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <div className="flex gap-3 flex-wrap">
                          {c.progress_photo_urls!.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                              className="block w-32 h-32 rounded-lg overflow-hidden border border-[#2a2a2a] hover:border-[#FF6A00] transition-colors">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={`Progress ${i + 1}`} className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </Card>
                    ))
                ) : (
                  <Card>
                    <p className="text-sm text-[#555] text-center py-6">
                      No progress photos yet. Upload photos with your check-ins to track your transformation!
                    </p>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'reports' && <ClientReports clientId={client.id} />}
          </>
        )}
      </Tabs>
    </div>
  )
}

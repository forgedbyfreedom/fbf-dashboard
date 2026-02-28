'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Tabs from '@/components/ui/Tabs'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import TrendCharts from '@/components/dashboard/TrendCharts'
import Timeline from '@/components/dashboard/Timeline'
import CoachNotes from '@/components/dashboard/CoachNotes'
import FlagBadge from '@/components/dashboard/FlagBadge'
import Button from '@/components/ui/Button'
import ProgramImport from '@/components/dashboard/ProgramImport'
import ProgramEditor from '@/components/dashboard/ProgramEditor'
import BodyCompChart from '@/components/dashboard/BodyCompChart'

interface ProtocolItem {
  [key: string]: string
}

interface ClientProfileProps {
  client: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    timezone: string
    target_calories: number | null
    target_protein: number | null
    target_steps: number | null
    is_active: boolean
    weigh_in_day?: string
    current_supplements?: ProtocolItem[]
    current_peds?: ProtocolItem[]
    current_peptides?: ProtocolItem[]
    program_name?: string
    workout_program?: Array<{ day: string; exercises: Array<{ name: string; sets: string; reps: string }> }>
    cardio_protocol?: Array<{ phase: string; duration: string; frequency: string; notes: string }>
    meal_plan?: Array<{ meal: string; description: string }>
    medical_protocol?: Array<{ name: string; dose: string; frequency: string; notes: string }>
    target_carbs?: number | null
    target_fats?: number | null
    target_water_oz?: number | null
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
    workout_notes: string | null
    workout_description: string | null
    rpe: number | null
    cardio_minutes: number | null
    supplements_json: string[]
    ped_log_json: string[]
    side_effects_notes: string | null
    general_notes: string | null
    mood_rating: number | null
    mood_notes: string | null
    body_temp: number | null
    water_oz: number | null
    stress_level: number | null
    estimated_calories_burned: number | null
    supplement_compliance: boolean | null
    progress_photo_urls: string[] | null
  }>
  flags: Array<{
    id: string
    flag_type: string
    severity: 'green' | 'yellow' | 'red'
    details: Record<string, unknown>
    created_at: string
  }>
  notes: Array<{
    id: string
    note: string
    action_items: string[]
    created_at: string
    profiles: { full_name: string | null }
  }>
  links: Array<{
    id: string
    status: string
    last_used_at: string | null
    created_at: string
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
    status: string
    open_flags_count: number
  } | null
}

export default function ClientProfile({ client, checkins, flags, notes, links, metrics }: ClientProfileProps) {
  const router = useRouter()
  const latest = checkins[0] || null
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [generatingLink, setGeneratingLink] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const handleGenerateLink = async () => {
    setGeneratingLink(true)
    try {
      const res = await fetch('/api/clients/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setGeneratedUrl(data.checkin_url)
    } catch (err) {
      console.error('Failed to generate link:', err)
    } finally {
      setGeneratingLink(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(generatedUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const tabs = [
    { id: 'latest', label: 'Latest' },
    { id: 'wellness', label: 'Wellness' },
    { id: 'program', label: 'Program' },
    { id: 'protocol', label: 'Protocol' },
    { id: 'trends', label: 'Trends' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'notes', label: 'Notes' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/')} className="text-[#888] hover:text-white text-sm">
          ← Back
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">
            {client.first_name} {client.last_name}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            {metrics && <Badge variant={metrics.status as 'green' | 'yellow' | 'red'}>{metrics.status}</Badge>}
            {flags.map(f => <FlagBadge key={f.id} severity={f.severity} type={f.flag_type} />)}
          </div>
        </div>
        {metrics && (
          <div className="hidden sm:flex gap-6 text-center">
            <div>
              <p className="text-lg font-bold text-white">{metrics.adherence_7d ?? 0}%</p>
              <p className="text-xs text-[#555]">Adherence</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">{metrics.weight_current ?? '—'}</p>
              <p className="text-xs text-[#555]">Weight</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">{metrics.open_flags_count}</p>
              <p className="text-xs text-[#555]">Flags</p>
            </div>
          </div>
        )}
      </div>

      <Tabs tabs={tabs} defaultTab="latest">
        {(activeTab) => (
          <>
            {activeTab === 'latest' && (
              <div>
                {latest ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <h3 className="text-sm font-semibold text-[#888] mb-4">
                        {new Date(latest.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-[#555]">Weight</p>
                          <p className="text-xl font-bold text-white">{latest.weight_lbs ?? '—'} <span className="text-sm text-[#555]">lbs</span></p>
                        </div>
                        <div>
                          <p className="text-xs text-[#555]">Sleep</p>
                          <p className="text-xl font-bold text-white">{latest.sleep_hours ?? '—'} <span className="text-sm text-[#555]">hrs</span></p>
                          {latest.sleep_quality && <p className="text-xs text-[#888]">Quality: {latest.sleep_quality}/5</p>}
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

                    {/* Wellness snapshot */}
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
                          <p className="text-xs text-[#555]">Temp</p>
                          <p className="text-xl font-bold text-white">{latest.body_temp ?? '—'}<span className="text-sm text-[#555]">°F</span></p>
                        </div>
                      </div>
                      {latest.mood_notes && (
                        <p className="text-sm text-[#ccc] mt-3 pt-3 border-t border-[#2a2a2a]">{latest.mood_notes}</p>
                      )}
                    </Card>

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

                    {latest.training_done && (
                      <Card>
                        <h3 className="text-sm font-semibold text-[#888] mb-3">Training</h3>
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="green">{latest.training_type || 'Trained'}</Badge>
                          {latest.rpe && <span className="text-sm text-[#888]">RPE: {latest.rpe}/10</span>}
                          {latest.estimated_calories_burned && (
                            <span className="text-sm text-[#D4A017]">~{latest.estimated_calories_burned} cal burned</span>
                          )}
                        </div>
                        {latest.workout_description && (
                          <p className="text-sm text-[#ccc] mb-2">{latest.workout_description}</p>
                        )}
                        {latest.workout_notes && <p className="text-sm text-[#999]">{latest.workout_notes}</p>}
                      </Card>
                    )}

                    {(latest.supplements_json?.length > 0 || latest.ped_log_json?.length > 0) && (
                      <Card>
                        <h3 className="text-sm font-semibold text-[#888] mb-3">Daily Protocol Log</h3>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant={latest.supplement_compliance !== false ? 'green' : 'red'}>
                            {latest.supplement_compliance !== false ? 'Compliant' : 'Missed'}
                          </Badge>
                        </div>
                        {latest.supplements_json?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-[#555] mb-1">Supplements</p>
                            {latest.supplements_json.map((s, i) => (
                              <p key={i} className="text-sm text-[#ccc]">{s}</p>
                            ))}
                          </div>
                        )}
                        {latest.ped_log_json?.length > 0 && (
                          <div>
                            <p className="text-xs text-[#555] mb-1">PED Log</p>
                            {latest.ped_log_json.map((p, i) => (
                              <p key={i} className="text-sm text-[#ccc]">{p}</p>
                            ))}
                          </div>
                        )}
                      </Card>
                    )}

                    {latest.side_effects_notes && (
                      <Card className="border-yellow-500/30">
                        <h3 className="text-sm font-semibold text-yellow-400 mb-2">Side Effects</h3>
                        <p className="text-sm text-[#ccc]">{latest.side_effects_notes}</p>
                      </Card>
                    )}

                    {latest.general_notes && (
                      <Card>
                        <h3 className="text-sm font-semibold text-[#888] mb-2">Notes</h3>
                        <p className="text-sm text-[#ccc]">{latest.general_notes}</p>
                      </Card>
                    )}
                  </div>
                ) : (
                  <p className="text-[#555] text-center py-12">No check-ins yet.</p>
                )}
              </div>
            )}

            {activeTab === 'wellness' && (
              <div className="space-y-4">
                {/* Wellness overview cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <p className="text-xs text-[#555] mb-1">Avg Mood (7d)</p>
                    <p className="text-2xl font-bold text-white">{metrics?.avg_mood_7d ?? '—'}<span className="text-sm text-[#555]">/10</span></p>
                  </Card>
                  <Card>
                    <p className="text-xs text-[#555] mb-1">Avg Stress (7d)</p>
                    <p className="text-2xl font-bold text-white">{metrics?.avg_stress_7d ?? '—'}<span className="text-sm text-[#555]">/10</span></p>
                  </Card>
                  <Card>
                    <p className="text-xs text-[#555] mb-1">Avg Water (7d)</p>
                    <p className="text-2xl font-bold text-white">{metrics?.avg_water_7d ?? '—'} <span className="text-sm text-[#555]">oz</span></p>
                  </Card>
                  <Card>
                    <p className="text-xs text-[#555] mb-1">Supplement Compliance</p>
                    <p className="text-2xl font-bold text-white">{metrics?.supplement_compliance_7d != null ? `${Math.round(metrics.supplement_compliance_7d)}%` : '—'}</p>
                  </Card>
                </div>

                {/* Recent mood/stress entries */}
                <Card>
                  <h3 className="text-sm font-semibold text-[#888] mb-4">Recent Wellness Entries</h3>
                  <div className="space-y-3">
                    {checkins.slice(0, 7).map(c => (
                      <div key={c.id} className="flex items-center gap-4 text-sm border-b border-[#1a1a1a] pb-2 last:border-0">
                        <span className="text-[#555] w-20">
                          {new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex gap-4 flex-1">
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
                            <span className="text-white">Temp: <span className={Number(c.body_temp) > 99.5 ? 'text-red-400' : 'text-green-400'}>{c.body_temp}°F</span></span>
                          )}
                        </div>
                        {c.mood_notes && (
                          <span className="text-[#888] text-xs truncate max-w-[200px]">{c.mood_notes}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'program' && (
              <div className="space-y-4">
                <ProgramEditor
                  clientId={client.id}
                  programName={client.program_name}
                  targetCalories={client.target_calories}
                  targetProtein={client.target_protein}
                  targetCarbs={client.target_carbs}
                  targetFats={client.target_fats}
                  targetWaterOz={client.target_water_oz}
                  targetSteps={client.target_steps}
                  weigh_in_day={client.weigh_in_day}
                  workoutProgram={client.workout_program}
                  cardioProtocol={client.cardio_protocol}
                  mealPlan={client.meal_plan}
                  medicalProtocol={client.medical_protocol}
                  currentSupplements={client.current_supplements as Array<{name: string; dose: string; frequency: string; [key: string]: string}>}
                  currentPeds={client.current_peds as Array<{compound: string; dose: string; frequency: string; route: string; [key: string]: string}>}
                  currentPeptides={client.current_peptides as Array<{name: string; dose: string; frequency: string; timing: string; [key: string]: string}>}
                  onSaved={() => window.location.reload()}
                />
                <ProgramImport clientId={client.id} onImported={() => window.location.reload()} />
              </div>
            )}

            {activeTab === 'protocol' && (
              <ProgramEditor
                clientId={client.id}
                programName={client.program_name}
                targetCalories={client.target_calories}
                targetProtein={client.target_protein}
                targetCarbs={client.target_carbs}
                targetFats={client.target_fats}
                targetWaterOz={client.target_water_oz}
                targetSteps={client.target_steps}
                weigh_in_day={client.weigh_in_day}
                workoutProgram={client.workout_program}
                cardioProtocol={client.cardio_protocol}
                mealPlan={client.meal_plan}
                medicalProtocol={client.medical_protocol}
                currentSupplements={client.current_supplements as Array<{name: string; dose: string; frequency: string; [key: string]: string}>}
                currentPeds={client.current_peds as Array<{compound: string; dose: string; frequency: string; route: string; [key: string]: string}>}
                currentPeptides={client.current_peptides as Array<{name: string; dose: string; frequency: string; timing: string; [key: string]: string}>}
                onSaved={() => window.location.reload()}
              />
            )}

            {activeTab === 'trends' && (
                  <div className="space-y-6">
                    <TrendCharts
                      checkins={checkins}
                      targetCalories={client.target_calories}
                      targetProtein={client.target_protein}
                      targetSteps={client.target_steps}
                      targetWaterOz={client.target_water_oz}
                    />
                    <BodyCompChart clientId={client.id} />
                  </div>
                )}

            {activeTab === 'timeline' && (
              <div className="space-y-4">
                <Timeline checkins={checkins} />
                {/* Progress Photos */}
                {checkins.some(c => c.progress_photo_urls && c.progress_photo_urls.length > 0) && (
                  <Card>
                    <h3 className="text-sm font-semibold text-[#888] mb-4">Progress Photos</h3>
                    <div className="space-y-4">
                      {checkins
                        .filter(c => c.progress_photo_urls && c.progress_photo_urls.length > 0)
                        .map(c => (
                          <div key={c.id}>
                            <p className="text-xs text-[#555] mb-2">
                              {new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {c.progress_photo_urls!.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-28 h-28 rounded-lg overflow-hidden border border-[#2a2a2a] hover:border-[#FF6A00] transition-colors">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={url} alt={`Progress ${i + 1}`} className="w-full h-full object-cover" />
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'notes' && <CoachNotes clientId={client.id} initialNotes={notes} />}

            {activeTab === 'settings' && (
              <div className="space-y-4">
                <Card>
                  <h3 className="text-sm font-semibold text-[#888] mb-4">Client Info</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[#555]">Email</p>
                      <p className="text-white">{client.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[#555]">Phone</p>
                      <p className="text-white">{client.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[#555]">Timezone</p>
                      <p className="text-white">{client.timezone}</p>
                    </div>
                    <div>
                      <p className="text-[#555]">Status</p>
                      <Badge variant={client.is_active ? 'green' : 'red'}>
                        {client.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-[#555]">Weigh-in Day</p>
                      <p className="text-white capitalize">{client.weigh_in_day || 'Monday'}</p>
                    </div>
                  </div>
                </Card>

                <Card>
                  <h3 className="text-sm font-semibold text-[#888] mb-4">Targets</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-[#555]">Calories</p>
                      <p className="text-white">{client.target_calories || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[#555]">Protein</p>
                      <p className="text-white">{client.target_protein ? `${client.target_protein}g` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[#555]">Steps</p>
                      <p className="text-white">{client.target_steps?.toLocaleString() || '—'}</p>
                    </div>
                  </div>
                </Card>

                <Card>
                  <h3 className="text-sm font-semibold text-[#888] mb-4">Bloodwork Analyzer</h3>
                  <p className="text-sm text-[#ccc] mb-3">
                    Use the AI-powered bloodwork analyzer to review {client.first_name}&apos;s labs.
                  </p>
                  <a
                    href="https://forgedbyfreedom.org/ai-coach"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4A017]/10 border border-[#D4A017]/30 rounded-lg text-sm text-[#D4A017] hover:bg-[#D4A017]/20 transition-colors"
                  >
                    Open Bloodwork AI
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </Card>

                <Card>
                  <h3 className="text-sm font-semibold text-[#888] mb-4">Check-in Link</h3>
                  {links.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {links.map(link => (
                        <div key={link.id} className="flex items-center justify-between text-sm">
                          <div>
                            <Badge variant="green">Active</Badge>
                            <span className="text-[#555] ml-2">
                              Created {new Date(link.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {link.last_used_at && (
                            <span className="text-xs text-[#555]">
                              Last used {new Date(link.last_used_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {generatedUrl ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
                        <p className="text-xs text-[#888] mb-1">Client Check-in URL:</p>
                        <p className="text-sm text-[#FF6A00] break-all">{generatedUrl}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={copyLink}>
                          {linkCopied ? 'Copied!' : 'Copy Link'}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={handleGenerateLink} disabled={generatingLink}>
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" onClick={handleGenerateLink} disabled={generatingLink}>
                      {generatingLink ? 'Generating...' : 'Generate New Check-in Link'}
                    </Button>
                  )}
                  <p className="text-xs text-[#555] mt-3">
                    Send this link to {client.first_name}. No login required — they open it and check in.
                  </p>
                </Card>
              </div>
            )}
          </>
        )}
      </Tabs>
    </div>
  )
}

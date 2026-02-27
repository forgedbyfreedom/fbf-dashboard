'use client'

import { useRouter } from 'next/navigation'
import Tabs from '@/components/ui/Tabs'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import TrendCharts from '@/components/dashboard/TrendCharts'
import Timeline from '@/components/dashboard/Timeline'
import CoachNotes from '@/components/dashboard/CoachNotes'
import FlagBadge from '@/components/dashboard/FlagBadge'

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
    rpe: number | null
    cardio_minutes: number | null
    supplements_json: string[]
    ped_log_json: string[]
    side_effects_notes: string | null
    general_notes: string | null
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

  const tabs = [
    { id: 'latest', label: 'Latest' },
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
                          {latest.sleep_quality && <p className="text-xs text-[#888]">Quality: {latest.sleep_quality}/10</p>}
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
                        </div>
                        {latest.workout_notes && <p className="text-sm text-[#ccc]">{latest.workout_notes}</p>}
                      </Card>
                    )}

                    {(latest.supplements_json?.length > 0 || latest.ped_log_json?.length > 0) && (
                      <Card>
                        <h3 className="text-sm font-semibold text-[#888] mb-3">Protocol</h3>
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

            {activeTab === 'trends' && <TrendCharts checkins={checkins} />}

            {activeTab === 'timeline' && <Timeline checkins={checkins} />}

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
                  <h3 className="text-sm font-semibold text-[#888] mb-4">Magic Links</h3>
                  {links.length > 0 ? (
                    <div className="space-y-2">
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
                  ) : (
                    <p className="text-sm text-[#555]">No active links.</p>
                  )}
                </Card>
              </div>
            )}
          </>
        )}
      </Tabs>
    </div>
  )
}

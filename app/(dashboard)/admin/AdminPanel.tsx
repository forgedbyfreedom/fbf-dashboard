'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

interface Coach {
  user_id: string
  role: string
  profiles: { id: string; full_name: string | null; email: string }
}

interface ClientAssignment {
  coach_user_id: string
  is_active: boolean
  profiles: { full_name: string | null }
}

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string | null
  is_active: boolean
  client_coach_assignments: ClientAssignment[]
}

interface AdminPanelProps {
  orgId: string
  coaches: Coach[]
  clients: Client[]
}

export default function AdminPanel({ orgId, coaches, clients: initialClients }: AdminPanelProps) {
  const [clients, setClients] = useState(initialClients)
  const [assignModal, setAssignModal] = useState<{ clientId: string; clientName: string } | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')

  const coachClientCounts = coaches.reduce((acc, coach) => {
    acc[coach.user_id] = clients.filter(c =>
      c.client_coach_assignments.some(a => a.coach_user_id === coach.user_id && a.is_active)
    ).length
    return acc
  }, {} as Record<string, number>)

  const handleAssign = async (clientId: string, coachUserId: string) => {
    const supabase = createClient()

    // Deactivate existing assignments
    await supabase
      .from('client_coach_assignments')
      .update({ is_active: false })
      .eq('client_id', clientId)

    // Create new assignment
    await supabase.from('client_coach_assignments').upsert({
      client_id: clientId,
      coach_user_id: coachUserId,
      is_active: true,
    }, { onConflict: 'client_id,coach_user_id' })

    // Update metrics
    await supabase
      .from('client_metrics')
      .update({ coach_user_id: coachUserId })
      .eq('client_id', clientId)

    setAssignModal(null)
    window.location.reload()
  }

  const handleDeactivate = async (clientId: string) => {
    const supabase = createClient()
    await supabase.from('clients').update({ is_active: false }).eq('id', clientId)
    setClients(clients.map(c => c.id === clientId ? { ...c, is_active: false } : c))
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Admin Panel</h2>

      {/* Coaches */}
      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-[#888] mb-4 uppercase tracking-wider">Coaches</h3>
        <div className="space-y-3">
          {coaches.map(coach => (
            <div key={coach.user_id} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">{coach.profiles.full_name || coach.profiles.email}</p>
                <p className="text-xs text-[#555]">{coach.profiles.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="muted">{coachClientCounts[coach.user_id] || 0} clients</Badge>
                <Badge variant={coach.role === 'org_admin' ? 'green' : 'muted'}>{coach.role}</Badge>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
          <p className="text-xs text-[#555] mb-2">Invite new coach (create account in Supabase Auth first)</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="coach@email.com"
              className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-[#555]"
            />
            <Button size="sm" onClick={async () => {
              if (!inviteEmail) return
              const supabase = createClient()
              // Find profile by email
              const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', inviteEmail)
                .single()
              if (profile) {
                await supabase.from('org_members').insert({
                  organization_id: orgId,
                  user_id: profile.id,
                  role: 'coach',
                })
                setInviteEmail('')
                window.location.reload()
              }
            }}>
              Add
            </Button>
          </div>
        </div>
      </Card>

      {/* Clients */}
      <Card padding={false}>
        <div className="p-4 border-b border-[#2a2a2a]">
          <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wider">All Clients ({clients.length})</h3>
        </div>
        <div className="divide-y divide-[#2a2a2a]">
          {clients.map(client => {
            const activeAssignment = client.client_coach_assignments.find(a => a.is_active)
            return (
              <div key={client.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">
                    {client.first_name} {client.last_name}
                    {!client.is_active && <Badge variant="red" className="ml-2">Inactive</Badge>}
                  </p>
                  <p className="text-xs text-[#555]">
                    Coach: {activeAssignment?.profiles?.full_name || 'Unassigned'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setAssignModal({ clientId: client.id, clientName: `${client.first_name} ${client.last_name}` })}
                  >
                    Reassign
                  </Button>
                  {client.is_active && (
                    <Button size="sm" variant="ghost" onClick={() => handleDeactivate(client.id)}>
                      Deactivate
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-2">Reassign Client</h3>
            <p className="text-sm text-[#888] mb-4">{assignModal.clientName}</p>
            <div className="space-y-2">
              {coaches.map(coach => (
                <button
                  key={coach.user_id}
                  onClick={() => handleAssign(assignModal.clientId, coach.user_id)}
                  className="w-full text-left px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-sm text-white hover:border-[#FF6A00] transition-colors"
                >
                  {coach.profiles.full_name || coach.profiles.email}
                  <span className="text-[#555] ml-2">({coachClientCounts[coach.user_id] || 0} clients)</span>
                </button>
              ))}
            </div>
            <Button variant="secondary" className="w-full mt-4" onClick={() => setAssignModal(null)}>
              Cancel
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}

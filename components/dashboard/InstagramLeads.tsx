'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

interface InstagramMessage {
  id: string
  direction: 'inbound' | 'outbound'
  message: string
  created_at: string
}

interface InstagramLead {
  id: string
  instagram_user_id: string
  instagram_username: string | null
  name: string | null
  status: string
  first_message: string | null
  notes: string | null
  auto_responded: boolean
  created_at: string
  updated_at: string
  instagram_messages: InstagramMessage[]
}

interface InstagramLeadsProps {
  initialLeads: InstagramLead[]
}

export default function InstagramLeads({ initialLeads }: InstagramLeadsProps) {
  const [leads, setLeads] = useState<InstagramLead[]>(initialLeads)
  const [selectedLead, setSelectedLead] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)

  const fetchLeads = async () => {
    const res = await fetch('/api/instagram/leads')
    if (res.ok) {
      const data = await res.json()
      setLeads(data.leads)
    }
  }

  const handleReply = async (leadId: string) => {
    if (!replyText.trim()) return
    setSending(true)

    try {
      const res = await fetch('/api/instagram/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, message: replyText.trim() }),
      })

      if (res.ok) {
        setReplyText('')
        fetchLeads()
      }
    } catch (err) {
      console.error('Reply failed:', err)
    } finally {
      setSending(false)
    }
  }

  const statusBadge = (status: string): 'green' | 'yellow' | 'red' | 'muted' => {
    return { new: 'yellow', contacted: 'muted', qualified: 'green', converted: 'green', archived: 'red' }[status] as 'green' | 'yellow' | 'red' | 'muted' || 'muted'
  }

  const selected = leads.find(l => l.id === selectedLead)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">DM Leads</h3>

      {leads.length === 0 ? (
        <Card>
          <p className="text-sm text-[#555] text-center py-8">No Instagram DM leads yet. When someone messages your page, they&apos;ll appear here.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Leads list */}
          <div className="space-y-2 lg:col-span-1">
            {leads.map(lead => (
              <button
                key={lead.id}
                onClick={() => setSelectedLead(lead.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedLead === lead.id
                    ? 'bg-[#FF6A00]/10 border-[#FF6A00]/30'
                    : 'bg-[#141414] border-[#2a2a2a] hover:border-[#333]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">
                    {lead.instagram_username || lead.name || `User ${lead.instagram_user_id.slice(-6)}`}
                  </span>
                  <Badge variant={statusBadge(lead.status)}>
                    {lead.status}
                  </Badge>
                </div>
                <p className="text-xs text-[#888] truncate">{lead.first_message}</p>
                <p className="text-[10px] text-[#555] mt-1">
                  {new Date(lead.updated_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                  })}
                </p>
              </button>
            ))}
          </div>

          {/* Conversation view */}
          <div className="lg:col-span-2">
            {selected ? (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      {selected.instagram_username || selected.name || `User ${selected.instagram_user_id.slice(-6)}`}
                    </h4>
                    <p className="text-xs text-[#555]">
                      Lead since {new Date(selected.created_at).toLocaleDateString()}
                      {selected.auto_responded && ' · Auto-responded'}
                    </p>
                  </div>
                  <Badge variant={statusBadge(selected.status)}>{selected.status}</Badge>
                </div>

                {/* Messages */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto mb-4">
                  {[...selected.instagram_messages]
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map(msg => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg max-w-[80%] ${
                          msg.direction === 'inbound'
                            ? 'bg-[#0a0a0a] border border-[#2a2a2a]'
                            : 'bg-[#FF6A00]/10 border border-[#FF6A00]/20 ml-auto'
                        }`}
                      >
                        <p className="text-sm text-[#ccc] whitespace-pre-wrap">{msg.message}</p>
                        <p className="text-[10px] text-[#555] mt-1">
                          {new Date(msg.created_at).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    ))}
                </div>

                {/* Reply */}
                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={2}
                    placeholder="Reply via Instagram DM..."
                    className="flex-1 px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-[#555] resize-none"
                  />
                  <Button
                    onClick={() => handleReply(selected.id)}
                    disabled={sending || !replyText.trim()}
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </Card>
            ) : (
              <Card>
                <p className="text-sm text-[#555] text-center py-12">Select a lead to view conversation</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

interface SMSMessage {
  id: string
  direction: 'inbound' | 'outbound'
  body: string
  message_type: string
  created_at: string
}

interface SMSPanelProps {
  clientId: string
  clientName: string
  clientPhone: string | null
  smsOptIn: boolean
}

export default function SMSPanel({ clientId, clientName, clientPhone, smsOptIn }: SMSPanelProps) {
  const [optIn, setOptIn] = useState(smsOptIn)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [messages, setMessages] = useState<SMSMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(true)

  const fetchMessages = useCallback(async () => {
    setLoadingMessages(true)
    const res = await fetch(`/api/sms/history?client_id=${clientId}`)
    if (res.ok) {
      const data = await res.json()
      setMessages(data.messages || [])
    }
    setLoadingMessages(false)
  }, [clientId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const handleToggleOptIn = async () => {
    const newVal = !optIn
    const res = await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sms_opt_in: newVal }),
    })
    if (res.ok) setOptIn(newVal)
  }

  const handleSend = async () => {
    if (!message.trim() || !clientPhone) return
    setError('')
    setSending(true)
    setSent(false)

    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, message: message.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send')
      }

      setSent(true)
      setMessage('')
      setTimeout(() => setSent(false), 3000)
      fetchMessages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const typeLabel = (type: string) => {
    const labels: Record<string, string> = {
      checkin: 'Check-in',
      chat: 'Chat',
      reminder: 'Reminder',
      motivational: 'Motivational',
      status_reply: 'Status',
      unknown: 'Message',
    }
    return labels[type] || type
  }

  const typeBadge = (type: string): 'green' | 'yellow' | 'red' | 'muted' => {
    const variants: Record<string, 'green' | 'yellow' | 'red' | 'muted'> = {
      checkin: 'green',
      reminder: 'yellow',
      motivational: 'muted',
      chat: 'muted',
      status_reply: 'green',
    }
    return variants[type] || 'muted'
  }

  return (
    <div className="space-y-4">
      {/* SMS Controls */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#888]">SMS</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-[#888]">SMS Opt-in</span>
            <button
              onClick={handleToggleOptIn}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                optIn ? 'bg-[#FF6A00]' : 'bg-[#2a2a2a]'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                optIn ? 'translate-x-5' : ''
              }`} />
            </button>
          </label>
        </div>

        {!clientPhone ? (
          <p className="text-sm text-[#555]">No phone number on file. Add one in Settings to enable SMS.</p>
        ) : (
          <>
            <div className="flex gap-2">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={2}
                placeholder={`Text ${clientName}...`}
                className="flex-1 px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-[#555] resize-none"
              />
              <div className="flex flex-col gap-1">
                <Button size="sm" onClick={handleSend} disabled={sending || !message.trim()}>
                  {sending ? 'Sending...' : 'Send'}
                </Button>
                {sent && <span className="text-xs text-green-400">Sent!</span>}
              </div>
            </div>
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          </>
        )}
      </Card>

      {/* Message History */}
      <Card>
        <h3 className="text-sm font-semibold text-[#888] mb-4">SMS History</h3>
        {loadingMessages ? (
          <p className="text-sm text-[#555]">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-[#555]">No SMS messages yet.</p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {messages.map(m => (
              <div
                key={m.id}
                className={`p-3 rounded-lg ${
                  m.direction === 'inbound'
                    ? 'bg-[#0a0a0a] border border-[#2a2a2a]'
                    : 'bg-[#FF6A00]/5 border border-[#FF6A00]/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={typeBadge(m.message_type)}>{typeLabel(m.message_type)}</Badge>
                  <span className="text-[11px] sm:text-xs text-[#555]">
                    {m.direction === 'inbound' ? '← From client' : '→ To client'}
                  </span>
                  <span className="text-[11px] sm:text-xs text-[#555] ml-auto">
                    {new Date(m.created_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm text-[#ccc]">{m.body}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

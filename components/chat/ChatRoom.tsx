'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import ChannelList from './ChannelList'
import MessageBubble from './MessageBubble'
import NewDMModal from './NewDMModal'

interface Channel {
  id: string
  name: string
  type: 'group' | 'dm'
  organization_id: string
}

interface Message {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

export default function ChatRoom() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [activeChannel, setActiveChannel] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [showNewDM, setShowNewDM] = useState(false)
  const [creatingDM, setCreatingDM] = useState(false)
  const [dmError, setDmError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef(createClient())

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabaseRef.current.auth.getUser()
      if (user) setUserId(user.id)
    }
    getUser()
  }, [])

  // Fetch channels
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await fetch('/api/chat/channels')
        const data = await res.json()
        if (res.ok && data.channels) {
          setChannels(data.channels)
          if (data.channels.length > 0 && !activeChannel) {
            setActiveChannel(data.channels[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch channels:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchChannels()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch messages when channel changes
  const fetchMessages = useCallback(async (channelId: string) => {
    try {
      const res = await fetch(`/api/chat/channels/${channelId}/messages`)
      const data = await res.json()
      if (res.ok) {
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    }
  }, [])

  useEffect(() => {
    if (activeChannel) {
      fetchMessages(activeChannel)
    }
  }, [activeChannel, fetchMessages])

  // Subscribe to realtime messages
  useEffect(() => {
    if (!activeChannel) return

    const channel = supabaseRef.current
      .channel(`chat-${activeChannel}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${activeChannel}`,
        },
        async (payload) => {
          // Fetch the full message with profile data
          const { data: msg } = await supabaseRef.current
            .from('chat_messages')
            .select('id, content, created_at, user_id, profiles:user_id(full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single()

          if (msg) {
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev
              return [...prev, msg as unknown as Message]
            })
          }
        }
      )
      .subscribe()

    const supabase = supabaseRef.current
    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeChannel])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || !activeChannel || !userId || sending) return
    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')

    try {
      const { error } = await supabaseRef.current
        .from('chat_messages')
        .insert({
          channel_id: activeChannel,
          user_id: userId,
          content,
        })

      if (error) {
        console.error('Send error:', error)
        setNewMessage(content) // Restore on failure
      }
    } catch {
      setNewMessage(content)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewDM = async (targetUserId: string) => {
    setCreatingDM(true)
    setDmError('')
    try {
      const res = await fetch('/api/chat/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetUserId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setDmError(data.error || 'Failed to create conversation')
        setCreatingDM(false)
        return
      }
      if (data.channel) {
        setShowNewDM(false)
        // Refresh channel list
        const chRes = await fetch('/api/chat/channels')
        const chData = await chRes.json()
        if (chRes.ok) setChannels(chData.channels)
        setActiveChannel(data.channel.id)
      }
    } catch (err) {
      console.error('Failed to create DM:', err)
      setDmError('Something went wrong. Please try again.')
    } finally {
      setCreatingDM(false)
    }
  }

  const activeChannelData = channels.find(c => c.id === activeChannel)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <p className="text-[#555]">Loading chat...</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-[#0a0a0a] rounded-xl border border-[#2a2a2a] overflow-hidden">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed bottom-24 left-4 z-50 w-12 h-12 bg-[#FF6A00] rounded-full flex items-center justify-center text-white shadow-lg"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Channel sidebar */}
      <div className={`${
        sidebarOpen ? 'fixed inset-0 z-40 bg-[#141414]' : 'hidden'
      } md:block md:relative md:w-64 md:bg-[#141414] md:border-r md:border-[#2a2a2a] flex-shrink-0`}>
        {sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden absolute top-3 right-3 text-[#888] hover:text-white"
          >
            x
          </button>
        )}
        <ChannelList
          channels={channels}
          activeId={activeChannel}
          onSelect={(id) => { setActiveChannel(id); setSidebarOpen(false) }}
          onNewDM={() => setShowNewDM(true)}
        />
      </div>

      {/* Message area */}
      <div className="flex-1 flex flex-col">
        {/* Channel header */}
        <div className="px-4 py-3 border-b border-[#2a2a2a] bg-[#141414]">
          <h3 className="text-sm font-semibold text-white">
            {activeChannelData?.type === 'group' ? '# ' : ''}{activeChannelData?.name || 'Select a channel'}
          </h3>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-[#555]">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map(msg => (
              <MessageBubble
                key={msg.id}
                content={msg.content}
                userName={msg.profiles?.full_name || 'User'}
                avatarUrl={msg.profiles?.avatar_url}
                timestamp={msg.created_at}
                isOwn={msg.user_id === userId}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {activeChannel && (
          <div className="px-4 py-3 border-t border-[#2a2a2a] bg-[#141414]">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-white text-sm placeholder-[#555] focus:border-[#FF6A00] focus:outline-none transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim() || sending}
                className="px-4 py-2.5 bg-[#FF6A00] text-white rounded-xl text-sm font-medium hover:bg-[#e55f00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New DM modal */}
      {showNewDM && (
        <NewDMModal
          onSelect={handleNewDM}
          onClose={() => { setShowNewDM(false); setDmError('') }}
          creating={creatingDM}
          error={dmError}
        />
      )}
    </div>
  )
}

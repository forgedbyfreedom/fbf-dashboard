'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface Note {
  id: string
  note: string
  action_items: string[]
  created_at: string
  profiles: { full_name: string | null }
}

interface CoachNotesProps {
  clientId: string
  initialNotes: Note[]
}

export default function CoachNotes({ clientId, initialNotes }: CoachNotesProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [newNote, setNewNote] = useState('')
  const [actionItems, setActionItems] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!newNote.trim()) return
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const items = actionItems
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)

    const { data, error } = await supabase
      .from('coach_notes')
      .insert({
        client_id: clientId,
        coach_user_id: user.id,
        note: newNote,
        action_items: items,
      })
      .select('*, profiles(full_name)')
      .single()

    if (!error && data) {
      setNotes([data, ...notes])
      setNewNote('')
      setActionItems('')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-sm font-semibold text-white mb-3">Add Note</h3>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write a coaching note..."
          className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white placeholder-[#555] text-sm min-h-[80px] mb-3"
        />
        <textarea
          value={actionItems}
          onChange={(e) => setActionItems(e.target.value)}
          placeholder="Action items (one per line)..."
          className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white placeholder-[#555] text-sm min-h-[60px] mb-3"
        />
        <Button onClick={handleAdd} disabled={saving || !newNote.trim()} size="sm">
          {saving ? 'Saving...' : 'Add Note'}
        </Button>
      </Card>

      {notes.map(note => (
        <Card key={note.id}>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-[#888]">{note.profiles?.full_name || 'Coach'}</span>
            <span className="text-xs text-[#555]">
              {new Date(note.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm text-white whitespace-pre-wrap">{note.note}</p>
          {note.action_items && note.action_items.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
              <p className="text-xs text-[#888] mb-1">Action Items:</p>
              <ul className="space-y-1">
                {note.action_items.map((item, i) => (
                  <li key={i} className="text-sm text-[#ccc] flex items-start gap-2">
                    <span className="text-[#FF6A00] mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      ))}

      {notes.length === 0 && (
        <p className="text-sm text-[#555] text-center py-8">No notes yet.</p>
      )}
    </div>
  )
}

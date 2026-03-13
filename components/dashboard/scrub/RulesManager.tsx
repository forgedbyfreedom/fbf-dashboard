'use client'

import { useState, useEffect } from 'react'

interface Rule {
  id: string
  name: string
  description: string | null
  field: string
  operator: string
  value: string | null
  action: 'approve' | 'deny'
  priority: number
  is_active: boolean
  condition_field: string | null
  condition_operator: string | null
  condition_value: string | null
}

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
  { value: 'in_list', label: 'In List' },
  { value: 'regex', label: 'Regex' },
  { value: 'all_pass', label: 'All Pass (catch-all)' },
]

export default function RulesManager() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRule, setEditingRule] = useState<Partial<Rule> | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/scrub/rules')
      const data = await res.json()
      setRules(data.rules || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRules()
  }, [])

  const handleSave = async () => {
    if (!editingRule?.name || !editingRule?.field || !editingRule?.operator || !editingRule?.action) return

    setSaving(true)
    try {
      const isNew = !editingRule.id
      const url = isNew ? '/api/scrub/rules' : `/api/scrub/rules/${editingRule.id}`
      const method = isNew ? 'POST' : 'PUT'

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRule),
      })

      setEditingRule(null)
      fetchRules()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rule?')) return

    try {
      await fetch(`/api/scrub/rules/${id}`, { method: 'DELETE' })
      fetchRules()
    } catch {
      // ignore
    }
  }

  const handleToggle = async (rule: Rule) => {
    try {
      await fetch(`/api/scrub/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !rule.is_active }),
      })
      fetchRules()
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-[#FF6A00] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-medium">Scrub Rules</h3>
          <p className="text-[#888] text-sm">Configure rules for auto-approving and denying visitors</p>
        </div>
        <button
          onClick={() => setEditingRule({ name: '', field: '', operator: 'equals', value: '', action: 'deny', priority: 50, is_active: true, condition_field: null, condition_operator: null, condition_value: null })}
          className="px-4 py-2 bg-[#FF6A00] text-white rounded-lg text-sm font-medium hover:bg-[#e55f00] transition-colors"
        >
          Add Rule
        </button>
      </div>

      {/* Rules Table */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-left">
              <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase">Active</th>
              <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase">Name</th>
              <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase">Field</th>
              <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase">Operator</th>
              <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase">Value</th>
              <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase">Action</th>
              <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase">Priority</th>
              <th className="px-4 py-3 text-xs font-medium text-[#888] uppercase w-24"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map(rule => (
              <tr key={rule.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]">
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleToggle(rule)}
                    className={`w-8 h-4 rounded-full transition-colors relative ${rule.is_active ? 'bg-green-500' : 'bg-[#333]'}`}
                  >
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${rule.is_active ? 'left-4' : 'left-0.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-2 text-white">{rule.name}</td>
                <td className="px-4 py-2 text-[#ccc] font-mono text-xs">{rule.field}</td>
                <td className="px-4 py-2 text-[#888]">{rule.operator}</td>
                <td className="px-4 py-2 text-[#888] font-mono text-xs">{rule.value || '—'}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    rule.action === 'deny' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {rule.action}
                  </span>
                </td>
                <td className="px-4 py-2 text-[#888]">{rule.priority}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingRule(rule)}
                      className="text-[#888] hover:text-white text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="text-[#888] hover:text-red-400 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-[#555]">
                  No rules configured. Add your first rule to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit/Create Modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-white font-medium mb-4">
              {editingRule.id ? 'Edit Rule' : 'New Rule'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-[#888] mb-1 block">Name</label>
                <input
                  type="text"
                  value={editingRule.name || ''}
                  onChange={e => setEditingRule({ ...editingRule, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
                  placeholder="Rule name"
                />
              </div>
              <div>
                <label className="text-sm text-[#888] mb-1 block">Description</label>
                <input
                  type="text"
                  value={editingRule.description || ''}
                  onChange={e => setEditingRule({ ...editingRule, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-[#888] mb-1 block">Field (CSV Column)</label>
                  <input
                    type="text"
                    value={editingRule.field || ''}
                    onChange={e => setEditingRule({ ...editingRule, field: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
                    placeholder="e.g. ID_Status"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#888] mb-1 block">Operator</label>
                  <select
                    value={editingRule.operator || 'equals'}
                    onChange={e => setEditingRule({ ...editingRule, operator: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
                  >
                    {OPERATORS.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-[#888] mb-1 block">Value</label>
                <input
                  type="text"
                  value={editingRule.value || ''}
                  onChange={e => setEditingRule({ ...editingRule, value: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
                  placeholder="Value to compare against (leave empty for is_empty/all_pass)"
                  disabled={editingRule.operator === 'is_empty' || editingRule.operator === 'is_not_empty' || editingRule.operator === 'all_pass'}
                />
              </div>
              {/* Compound Condition */}
              <div className="border border-[#2a2a2a] rounded-lg p-3">
                <label className="text-sm text-[#888] mb-2 block">AND Condition (optional — both must match)</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={editingRule.condition_field || ''}
                    onChange={e => setEditingRule({ ...editingRule, condition_field: e.target.value || null })}
                    className="px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
                    placeholder="Field (e.g. Family_Type)"
                  />
                  <select
                    value={editingRule.condition_operator || ''}
                    onChange={e => setEditingRule({ ...editingRule, condition_operator: e.target.value || null })}
                    className="px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
                  >
                    <option value="">No condition</option>
                    {OPERATORS.filter(o => o.value !== 'all_pass').map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={editingRule.condition_value || ''}
                    onChange={e => setEditingRule({ ...editingRule, condition_value: e.target.value || null })}
                    className="px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
                    placeholder="Value"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-[#888] mb-1 block">Action</label>
                  <select
                    value={editingRule.action || 'deny'}
                    onChange={e => setEditingRule({ ...editingRule, action: e.target.value as 'approve' | 'deny' })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
                  >
                    <option value="deny">Deny</option>
                    <option value="approve">Approve</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-[#888] mb-1 block">Priority</label>
                  <input
                    type="number"
                    value={editingRule.priority ?? 50}
                    onChange={e => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setEditingRule(null)}
                  className="flex-1 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[#888] text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-[#FF6A00] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

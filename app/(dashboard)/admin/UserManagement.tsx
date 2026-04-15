'use client'

import { useState, useEffect, useCallback } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'

interface UserRecord {
  auth_id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  confirmed_at: string | null
  banned_until: string | null
  client_id: string | null
  client_name: string | null
  is_active: boolean | null
}

type ModalType =
  | 'reset_password'
  | 'update_email'
  | 'create_user'
  | 'delete_confirm'
  | 'send_invite'
  | 'mass_email'
  | null

interface Toast {
  message: string
  type: 'success' | 'error'
}

type EmailTemplate = 'checkin_reminder' | 'program_update' | 'promotion' | 'custom'

const EMAIL_TEMPLATES: Record<EmailTemplate, { label: string; subject: string; body: string }> = {
  checkin_reminder: {
    label: 'Check-in Reminder',
    subject: 'Reminder: Complete Your Daily Check-in',
    body: `Hey there,

Just a quick reminder to complete your daily check-in on the FBF portal. Consistent tracking is the foundation of progress.

Your check-in takes less than 2 minutes and helps your coach make better adjustments to your program.

Log in now and get it done:
https://fbf-dashboard.vercel.app/portal

Stay disciplined. Stay free.

— The FBF Team`,
  },
  program_update: {
    label: 'Program Update',
    subject: 'Program Update — Forged by Freedom',
    body: `Hey there,

We've made some updates to your coaching program. Log in to the portal to review the latest changes and reach out to your coach with any questions.

https://fbf-dashboard.vercel.app/portal

Keep pushing forward.

— The FBF Team`,
  },
  promotion: {
    label: 'Promotion',
    subject: 'Special Offer — Forged by Freedom',
    body: `Hey there,

We have an exclusive offer just for our FBF community. Check out the details below and take advantage before it expires.

[Add your promotion details here]

— The FBF Team`,
  },
  custom: {
    label: 'Custom',
    subject: '',
    body: '',
  },
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalType>(null)
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  // Form fields
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formFirstName, setFormFirstName] = useState('')
  const [formLastName, setFormLastName] = useState('')

  // Mass email state
  const [massEmailFilter, setMassEmailFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [massEmailSelected, setMassEmailSelected] = useState<Set<string>>(new Set())
  const [massEmailSubject, setMassEmailSubject] = useState('')
  const [massEmailBody, setMassEmailBody] = useState('')
  const [massEmailTemplate, setMassEmailTemplate] = useState<EmailTemplate>('custom')
  const [massEmailSending, setMassEmailSending] = useState(false)
  const [massEmailProgress, setMassEmailProgress] = useState<{ sent: number; total: number } | null>(null)

  // Invite state
  const [invitePassword, setInvitePassword] = useState('')

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (res.ok) {
        setUsers(data.users)
      } else {
        showToast(data.error || 'Failed to load users', 'error')
      }
    } catch {
      showToast('Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const performAction = async (payload: Record<string, unknown>) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('Action completed successfully', 'success')
        setModal(null)
        setSelectedUser(null)
        resetForm()
        await fetchUsers()
      } else {
        showToast(data.error || 'Action failed', 'error')
      }
    } catch {
      showToast('Action failed', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const resetForm = () => {
    setFormEmail('')
    setFormPassword('')
    setFormFirstName('')
    setFormLastName('')
    setInvitePassword('')
  }

  const openModal = (type: ModalType, user?: UserRecord) => {
    resetForm()
    setSelectedUser(user || null)
    if (user && type === 'update_email') setFormEmail(user.email || '')
    if (type === 'mass_email') {
      setMassEmailSelected(new Set())
      setMassEmailSubject('')
      setMassEmailBody('')
      setMassEmailTemplate('custom')
      setMassEmailFilter('all')
      setMassEmailProgress(null)
    }
    setModal(type)
  }

  const isBanned = (user: UserRecord) => {
    if (!user.banned_until) return false
    return new Date(user.banned_until) > new Date()
  }

  const getStatus = (user: UserRecord): { label: string; variant: 'green' | 'red' | 'yellow' | 'muted' } => {
    if (isBanned(user)) return { label: 'Banned', variant: 'red' }
    if (user.is_active === false) return { label: 'Inactive', variant: 'yellow' }
    if (user.is_active === true) return { label: 'Active', variant: 'green' }
    return { label: 'No Client', variant: 'muted' }
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase()
    return (
      (u.email || '').toLowerCase().includes(q) ||
      (u.client_name || '').toLowerCase().includes(q)
    )
  })

  // Mass email: filter users for the recipient list
  const massEmailUsers = users.filter(u => {
    if (u.client_id === null) return false // only users with client records
    if (massEmailFilter === 'active') return u.is_active === true
    if (massEmailFilter === 'inactive') return u.is_active === false
    return true
  })

  const handleSelectAll = () => {
    if (massEmailSelected.size === massEmailUsers.length) {
      setMassEmailSelected(new Set())
    } else {
      setMassEmailSelected(new Set(massEmailUsers.map(u => u.auth_id)))
    }
  }

  const toggleMassEmailUser = (authId: string) => {
    const next = new Set(massEmailSelected)
    if (next.has(authId)) {
      next.delete(authId)
    } else {
      next.add(authId)
    }
    setMassEmailSelected(next)
  }

  const handleTemplateChange = (template: EmailTemplate) => {
    setMassEmailTemplate(template)
    const t = EMAIL_TEMPLATES[template]
    setMassEmailSubject(t.subject)
    setMassEmailBody(t.body)
  }

  const handleSendMassEmail = async () => {
    if (!massEmailSelected.size || !massEmailSubject || !massEmailBody) return
    setMassEmailSending(true)
    setMassEmailProgress({ sent: 0, total: massEmailSelected.size })

    const recipients = users
      .filter(u => massEmailSelected.has(u.auth_id))
      .map(u => ({ email: u.email, name: u.client_name || '' }))

    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_mass_email',
          recipients,
          subject: massEmailSubject,
          body: massEmailBody,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMassEmailProgress({ sent: data.sent, total: data.sent + data.failed })
        showToast(`Sent ${data.sent} email(s)${data.failed ? `, ${data.failed} failed` : ''}`, data.failed ? 'error' : 'success')
        if (!data.failed) {
          setTimeout(() => setModal(null), 1500)
        }
      } else {
        showToast(data.error || 'Failed to send emails', 'error')
      }
    } catch {
      showToast('Failed to send emails', 'error')
    } finally {
      setMassEmailSending(false)
    }
  }

  const handleSendInvite = async (user: UserRecord) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_invite',
          email: user.email,
          name: user.client_name || '',
          password: invitePassword || 'DISCIPLINE',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast(`Invite sent to ${user.email}`, 'success')
        setModal(null)
        setSelectedUser(null)
        resetForm()
      } else {
        showToast(data.error || 'Failed to send invite', 'error')
      }
    } catch {
      showToast('Failed to send invite', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="mt-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#FF6A00] border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-[#888] text-sm">Loading users...</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="mt-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">User Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => openModal('mass_email')}
            className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-[#FF6A00] hover:bg-[#FF8533] transition-colors shadow-lg shadow-[#FF6A00]/20"
          >
            📧 Send Mass Email
          </button>
          <Button size="sm" onClick={() => openModal('create_user')}>
            + Add User
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Users Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#888] uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#888] uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#888] uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#888] uppercase tracking-wider">Last Login</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#888] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {filteredUsers.map(user => {
                const status = getStatus(user)
                return (
                  <tr key={user.auth_id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-4 py-3 text-white">
                      {user.client_name || <span className="text-[#555] italic">No profile</span>}
                    </td>
                    <td className="px-4 py-3 text-[#aaa]">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[#888]">{formatDate(user.last_sign_in_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openModal('send_invite', user)}
                        >
                          Invite
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openModal('reset_password', user)}
                        >
                          Reset PW
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openModal('update_email', user)}
                        >
                          Email
                        </Button>
                        {isBanned(user) ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => performAction({ action: 'unban_user', auth_id: user.auth_id })}
                          >
                            Unban
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => performAction({ action: 'ban_user', auth_id: user.auth_id })}
                          >
                            Ban
                          </Button>
                        )}
                        {user.is_active !== null && (
                          <Button
                            size="sm"
                            variant={user.is_active ? 'ghost' : 'secondary'}
                            onClick={() => performAction({ action: 'toggle_active', auth_id: user.auth_id })}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => openModal('delete_confirm', user)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#555]">
                    {search ? 'No users match your search' : 'No users found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-[#2a2a2a]">
          <p className="text-xs text-[#555]">{filteredUsers.length} of {users.length} users</p>
        </div>
      </Card>

      {/* Send Invite Modal */}
      {modal === 'send_invite' && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-1">Send Login Credentials</h3>
            <p className="text-sm text-[#888] mb-1">
              Send a welcome email with login details to:
            </p>
            <p className="text-sm text-white font-medium mb-1">{selectedUser.client_name || 'Unknown'}</p>
            <p className="text-sm text-[#aaa] mb-4">{selectedUser.email}</p>
            <Input
              label="Temporary Password (included in email)"
              type="text"
              value={invitePassword}
              onChange={e => setInvitePassword(e.target.value)}
              placeholder="Default: DISCIPLINE"
            />
            <p className="text-xs text-[#555] mt-2 mb-4">
              The email will include the portal link, their email, and this password.
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={actionLoading}
                onClick={() => handleSendInvite(selectedUser)}
              >
                {actionLoading ? 'Sending...' : 'Send Invite'}
              </Button>
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Mass Email Modal */}
      {modal === 'mass_email' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="max-w-2xl w-full my-8">
            <h3 className="text-lg font-bold text-white mb-4">Send Mass Email</h3>

            {/* Template selector */}
            <div className="mb-4">
              <label className="block text-sm text-[#888] mb-1.5">Template</label>
              <select
                value={massEmailTemplate}
                onChange={e => handleTemplateChange(e.target.value as EmailTemplate)}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white text-sm appearance-none cursor-pointer"
              >
                <option value="custom">Custom</option>
                <option value="checkin_reminder">Check-in Reminder</option>
                <option value="program_update">Program Update</option>
                <option value="promotion">Promotion</option>
              </select>
            </div>

            {/* Subject */}
            <div className="mb-4">
              <Input
                label="Subject"
                value={massEmailSubject}
                onChange={e => setMassEmailSubject(e.target.value)}
                placeholder="Email subject line"
              />
            </div>

            {/* Body */}
            <div className="mb-4">
              <label className="block text-sm text-[#888] mb-1.5">Body</label>
              <textarea
                value={massEmailBody}
                onChange={e => setMassEmailBody(e.target.value)}
                placeholder="Write your email content here..."
                rows={8}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white placeholder-[#555] text-sm resize-y"
              />
            </div>

            {/* Recipient filter */}
            <div className="mb-3">
              <label className="block text-sm text-[#888] mb-1.5">Recipients</label>
              <div className="flex gap-2 mb-3">
                {(['all', 'active', 'inactive'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => {
                      setMassEmailFilter(f)
                      setMassEmailSelected(new Set())
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      massEmailFilter === f
                        ? 'bg-[#FF6A00] text-white'
                        : 'bg-[#0a0a0a] border border-[#2a2a2a] text-[#888] hover:text-white'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'active' ? 'Active Only' : 'Inactive Only'}
                  </button>
                ))}
              </div>
            </div>

            {/* Select all */}
            <div className="mb-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-[#888] hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={massEmailSelected.size === massEmailUsers.length && massEmailUsers.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-[#2a2a2a] bg-[#0a0a0a] accent-[#FF6A00]"
                />
                Select All ({massEmailUsers.length})
              </label>
            </div>

            {/* User checkboxes */}
            <div className="max-h-48 overflow-y-auto border border-[#2a2a2a] rounded-lg mb-4">
              {massEmailUsers.length === 0 ? (
                <p className="px-4 py-3 text-sm text-[#555]">No users match this filter</p>
              ) : (
                massEmailUsers.map(user => {
                  const status = getStatus(user)
                  return (
                    <label
                      key={user.auth_id}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-[#1a1a1a] cursor-pointer transition-colors border-b border-[#2a2a2a] last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={massEmailSelected.has(user.auth_id)}
                        onChange={() => toggleMassEmailUser(user.auth_id)}
                        className="w-4 h-4 rounded border-[#2a2a2a] bg-[#0a0a0a] accent-[#FF6A00] flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-white truncate block">
                          {user.client_name || 'No profile'}
                        </span>
                        <span className="text-xs text-[#555] truncate block">{user.email}</span>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </label>
                  )
                })
              )}
            </div>

            {/* Progress indicator */}
            {massEmailProgress && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-[#888]">Sending progress</span>
                  <span className="text-white font-medium">
                    {massEmailProgress.sent} / {massEmailProgress.total}
                  </span>
                </div>
                <div className="w-full bg-[#0a0a0a] rounded-full h-2 border border-[#2a2a2a]">
                  <div
                    className="bg-[#FF6A00] h-full rounded-full transition-all"
                    style={{
                      width: `${massEmailProgress.total > 0
                        ? (massEmailProgress.sent / massEmailProgress.total) * 100
                        : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={!massEmailSelected.size || !massEmailSubject || !massEmailBody || massEmailSending}
                onClick={handleSendMassEmail}
              >
                {massEmailSending
                  ? 'Sending...'
                  : `Send to ${massEmailSelected.size} Recipient${massEmailSelected.size !== 1 ? 's' : ''}`}
              </Button>
              <Button variant="secondary" onClick={() => setModal(null)} disabled={massEmailSending}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Reset Password Modal */}
      {modal === 'reset_password' && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-1">Reset Password</h3>
            <p className="text-sm text-[#888] mb-4">{selectedUser.email}</p>
            <Input
              label="New Password"
              type="password"
              value={formPassword}
              onChange={e => setFormPassword(e.target.value)}
              placeholder="Enter new password"
            />
            <div className="flex gap-2 mt-4">
              <Button
                className="flex-1"
                disabled={!formPassword || actionLoading}
                onClick={() => performAction({
                  action: 'reset_password',
                  auth_id: selectedUser.auth_id,
                  password: formPassword,
                })}
              >
                {actionLoading ? 'Saving...' : 'Reset Password'}
              </Button>
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Update Email Modal */}
      {modal === 'update_email' && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-1">Change Email</h3>
            <p className="text-sm text-[#888] mb-4">{selectedUser.client_name || selectedUser.email}</p>
            <Input
              label="New Email"
              type="email"
              value={formEmail}
              onChange={e => setFormEmail(e.target.value)}
              placeholder="new@email.com"
            />
            <div className="flex gap-2 mt-4">
              <Button
                className="flex-1"
                disabled={!formEmail || actionLoading}
                onClick={() => performAction({
                  action: 'update_email',
                  auth_id: selectedUser.auth_id,
                  email: formEmail,
                })}
              >
                {actionLoading ? 'Saving...' : 'Update Email'}
              </Button>
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Create User Modal */}
      {modal === 'create_user' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <h3 className="text-lg font-bold text-white mb-4">Add New User</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  value={formFirstName}
                  onChange={e => setFormFirstName(e.target.value)}
                  placeholder="John"
                />
                <Input
                  label="Last Name"
                  value={formLastName}
                  onChange={e => setFormLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
              <Input
                label="Email"
                type="email"
                value={formEmail}
                onChange={e => setFormEmail(e.target.value)}
                placeholder="john@example.com"
              />
              <Input
                label="Password"
                type="password"
                value={formPassword}
                onChange={e => setFormPassword(e.target.value)}
                placeholder="Leave blank for default (DISCIPLINE)"
              />
            </div>
            <p className="text-xs text-[#555] mt-3">
              A welcome email with login credentials will be sent automatically.
            </p>
            <div className="flex gap-2 mt-4">
              <Button
                className="flex-1"
                disabled={!formEmail || actionLoading}
                onClick={() => performAction({
                  action: 'create_user',
                  email: formEmail,
                  password: formPassword || undefined,
                  first_name: formFirstName,
                  last_name: formLastName,
                })}
              >
                {actionLoading ? 'Creating...' : 'Create User'}
              </Button>
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modal === 'delete_confirm' && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="max-w-sm w-full">
            <h3 className="text-lg font-bold text-red-400 mb-2">Delete User</h3>
            <p className="text-sm text-[#888] mb-1">
              Are you sure you want to permanently delete this user?
            </p>
            <p className="text-sm text-white font-medium mb-1">
              {selectedUser.client_name || 'Unknown'}
            </p>
            <p className="text-sm text-[#888] mb-4">{selectedUser.email}</p>
            <p className="text-xs text-red-400/80 mb-4">
              This will remove the auth account, client record, check-ins, metrics, badges, streaks, and chat memberships. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                className="flex-1"
                disabled={actionLoading}
                onClick={() => performAction({
                  action: 'delete_user',
                  auth_id: selectedUser.auth_id,
                })}
              >
                {actionLoading ? 'Deleting...' : 'Yes, Delete'}
              </Button>
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

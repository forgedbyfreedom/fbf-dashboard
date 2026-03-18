'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SettingsPage() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [client, setClient] = useState<{ first_name?: string; last_name?: string; timezone?: string; weigh_in_day?: string; id?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  // Oura
  const [ouraToken, setOuraToken] = useState('')
  const [ouraConnected, setOuraConnected] = useState(false)
  const [ouraLoading, setOuraLoading] = useState(false)
  const [ouraLastSync, setOuraLastSync] = useState<string | null>(null)
  const [showOuraInput, setShowOuraInput] = useState(false)

  // Garmin
  const [garminConnected, setGarminConnected] = useState(false)
  const [garminLastSync, setGarminLastSync] = useState<string | null>(null)
  const [showGarminPaste, setShowGarminPaste] = useState(false)
  const [garminData, setGarminData] = useState('')
  const [garminLoading, setGarminLoading] = useState(false)

  // Password change
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => {
    loadProfile()
    // Load saved integration state from localStorage
    const oura = localStorage.getItem('fbf_oura_connected')
    const ouraSync = localStorage.getItem('fbf_oura_last_sync')
    const garmin = localStorage.getItem('fbf_garmin_connected')
    const garminSync = localStorage.getItem('fbf_garmin_last_sync')
    if (oura === 'true') setOuraConnected(true)
    if (ouraSync) setOuraLastSync(ouraSync)
    if (garmin === 'true') setGarminConnected(true)
    if (garminSync) setGarminLastSync(garminSync)
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      const res = await fetch('/api/client/me', {
        headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setClient(data.client)
      }
    }
    setLoading(false)
  }

  async function handleOuraConnect() {
    if (!ouraToken.trim()) return
    setOuraLoading(true)
    try {
      const res = await fetch('https://api.ouraring.com/v2/usercollection/personal_info', {
        headers: { Authorization: `Bearer ${ouraToken.trim()}` }
      })
      if (!res.ok) {
        alert('Invalid Oura token. Please check and try again.')
        setOuraLoading(false)
        return
      }
      const now = new Date().toLocaleString()
      localStorage.setItem('fbf_oura_connected', 'true')
      localStorage.setItem('fbf_oura_token', ouraToken.trim())
      localStorage.setItem('fbf_oura_last_sync', now)
      setOuraConnected(true)
      setOuraLastSync(now)
      setOuraToken('')
      setShowOuraInput(false)
    } catch {
      alert('Failed to verify Oura token.')
    } finally {
      setOuraLoading(false)
    }
  }

  function handleOuraDisconnect() {
    if (!confirm('Disconnect Oura Ring?')) return
    localStorage.removeItem('fbf_oura_connected')
    localStorage.removeItem('fbf_oura_token')
    localStorage.removeItem('fbf_oura_last_sync')
    setOuraConnected(false)
    setOuraLastSync(null)
  }

  async function handleGarminImport() {
    if (!garminData.trim()) return
    setGarminLoading(true)
    try {
      let parsed: unknown
      try { parsed = JSON.parse(garminData.trim()) } catch {
        alert('Invalid JSON. Please paste valid Garmin export data.')
        setGarminLoading(false)
        return
      }
      const dataArray = Array.isArray(parsed) ? parsed : [parsed]
      const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
      const res = await fetch(`${API_URL}/api/garmin/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client?.id || null, data: dataArray })
      })
      const result = await res.json()
      if (!res.ok) {
        alert(result.error || 'Import failed.')
        setGarminLoading(false)
        return
      }
      const now = new Date().toLocaleString()
      localStorage.setItem('fbf_garmin_connected', 'true')
      localStorage.setItem('fbf_garmin_last_sync', now)
      setGarminConnected(true)
      setGarminLastSync(now)
      setGarminData('')
      setShowGarminPaste(false)
      alert(`Imported ${result.imported} record(s) from Garmin.`)
    } catch {
      alert('Failed to import Garmin data.')
    } finally {
      setGarminLoading(false)
    }
  }

  function handleGarminDisconnect() {
    if (!confirm('Disconnect Garmin?')) return
    localStorage.removeItem('fbf_garmin_connected')
    localStorage.removeItem('fbf_garmin_last_sync')
    setGarminConnected(false)
    setGarminLastSync(null)
  }

  async function handlePasswordChange() {
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    setPasswordLoading(true)
    setPasswordMsg(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordMsg({ type: 'error', text: error.message })
    } else {
      setPasswordMsg({ type: 'success', text: 'Password updated successfully.' })
      setNewPassword('')
      setConfirmPassword('')
    }
    setPasswordLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[#FF6A00] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Profile Info */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
            <span className="text-sm text-[#888]">Name</span>
            <span className="text-sm text-white font-medium">
              {client ? `${client.first_name} ${client.last_name}` : '--'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
            <span className="text-sm text-[#888]">Email</span>
            <span className="text-sm text-white font-medium">{user?.email ?? '--'}</span>
          </div>
          {client?.timezone && (
            <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
              <span className="text-sm text-[#888]">Timezone</span>
              <span className="text-sm text-white font-medium">{client.timezone}</span>
            </div>
          )}
          {client?.weigh_in_day && (
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-[#888]">Weigh-in Day</span>
              <span className="text-sm text-white font-medium capitalize">{client.weigh_in_day}</span>
            </div>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Change Password</h2>
        <div className="space-y-3">
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-white placeholder-[#555] focus:border-[#FF6A00] outline-none"
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-white placeholder-[#555] focus:border-[#FF6A00] outline-none"
          />
          {passwordMsg && (
            <p className={`text-sm ${passwordMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {passwordMsg.text}
            </p>
          )}
          <button
            onClick={handlePasswordChange}
            disabled={passwordLoading}
            className="px-6 py-2.5 bg-[#FF6A00] text-white text-sm font-semibold rounded-lg hover:bg-[#e55f00] disabled:opacity-50 transition-colors"
          >
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>

      {/* Wearable Integrations */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Wearable Integrations</h2>
        <p className="text-xs text-[#666] mb-4">
          Connect your wearable devices to auto-populate check-in data.
          Apple HealthKit is available in the mobile app only.
        </p>

        {/* Oura Ring */}
        <div className="border border-[#2a2a2a] rounded-lg p-4 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1a1a2e] flex items-center justify-center text-lg">
                💍
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Oura Ring</p>
                {ouraConnected ? (
                  <p className="text-xs text-green-400">Connected{ouraLastSync ? ` — ${ouraLastSync}` : ''}</p>
                ) : (
                  <p className="text-xs text-[#666]">Personal Access Token</p>
                )}
              </div>
            </div>
            {ouraConnected ? (
              <button
                onClick={handleOuraDisconnect}
                className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 border border-red-400/30 rounded-lg"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={() => setShowOuraInput(!showOuraInput)}
                className="text-xs text-[#FF6A00] hover:text-white px-3 py-1.5 border border-[#FF6A00]/30 rounded-lg"
              >
                Connect
              </button>
            )}
          </div>
          {showOuraInput && !ouraConnected && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-[#888]">
                Get your token at{' '}
                <a href="https://cloud.ouraring.com/personal-access-tokens" target="_blank" rel="noopener noreferrer" className="text-[#FF6A00] underline">
                  cloud.ouraring.com/personal-access-tokens
                </a>
              </p>
              <input
                type="password"
                placeholder="Paste Oura Personal Access Token..."
                value={ouraToken}
                onChange={(e) => setOuraToken(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#555] focus:border-[#FF6A00] outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowOuraInput(false); setOuraToken('') }}
                  className="text-xs text-[#888] px-4 py-2 border border-[#2a2a2a] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOuraConnect}
                  disabled={ouraLoading}
                  className="text-xs text-white font-semibold px-4 py-2 bg-[#FF6A00] rounded-lg hover:bg-[#e55f00] disabled:opacity-50"
                >
                  {ouraLoading ? 'Verifying...' : 'Connect'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Garmin Connect */}
        <div className="border border-[#2a2a2a] rounded-lg p-4 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0a1a2e] flex items-center justify-center text-lg">
                ⌚
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Garmin Connect</p>
                {garminConnected ? (
                  <p className="text-xs text-green-400">Connected{garminLastSync ? ` — ${garminLastSync}` : ''}</p>
                ) : (
                  <p className="text-xs text-[#666]">Manual JSON import</p>
                )}
              </div>
            </div>
            {garminConnected ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowGarminPaste(true)}
                  className="text-xs text-[#007CC3] hover:text-white px-3 py-1.5 border border-[#007CC3]/30 rounded-lg"
                >
                  Sync
                </button>
                <button
                  onClick={handleGarminDisconnect}
                  className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 border border-red-400/30 rounded-lg"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowGarminPaste(!showGarminPaste)}
                className="text-xs text-[#007CC3] hover:text-white px-3 py-1.5 border border-[#007CC3]/30 rounded-lg"
              >
                Connect
              </button>
            )}
          </div>
          {showGarminPaste && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-[#888]">
                Export your data from{' '}
                <a href="https://connect.garmin.com" target="_blank" rel="noopener noreferrer" className="text-[#007CC3] underline">
                  connect.garmin.com
                </a>
                {' '}→ Account Settings → Export Your Data, then paste the JSON below.
              </p>
              <textarea
                placeholder='[{"calendarDate":"2026-03-17","steps":8500,"restingHeartRate":58,...}]'
                value={garminData}
                onChange={(e) => setGarminData(e.target.value)}
                rows={5}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-xs text-white placeholder-[#555] font-mono focus:border-[#007CC3] outline-none resize-y"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowGarminPaste(false); setGarminData('') }}
                  className="text-xs text-[#888] px-4 py-2 border border-[#2a2a2a] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGarminImport}
                  disabled={garminLoading}
                  className="text-xs text-white font-semibold px-4 py-2 bg-[#007CC3] rounded-lg hover:bg-[#006aaa] disabled:opacity-50"
                >
                  {garminLoading ? 'Importing...' : 'Import Data'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Apple HealthKit (info only) */}
        <div className="border border-[#2a2a2a] rounded-lg p-4 opacity-60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1a0a0a] flex items-center justify-center text-lg">
              ❤️
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Apple HealthKit</p>
              <p className="text-xs text-[#666]">Available in the FBF iOS app only</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <div className="text-center pb-8">
        <form action="/api/auth/signout" method="POST">
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/login'
            }}
            className="text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Sign Out
          </button>
        </form>
        <p className="text-[10px] text-[#444] mt-4">Forged by Freedom v1.0.0</p>
      </div>
    </div>
  )
}

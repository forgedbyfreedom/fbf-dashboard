'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/client/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create account.')
        setLoading(false)
        return
      }

      setSuccess('Account created! Redirecting to complete your intake...')
      setTimeout(() => {
        window.location.href = 'https://forgedbyfreedom.org/onboarding'
      }, 2000)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 relative overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt=""
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] max-w-[600px] opacity-[0.15] pointer-events-none select-none z-0"
      />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Forged By Freedom" className="h-20 mx-auto mb-4" />
          <h1 className="text-3xl font-black text-white tracking-widest">FORGED BY FREEDOM</h1>
          <p className="text-xs text-[#D4A017] font-semibold tracking-[0.3em] uppercase mt-2">Strength &bull; Discipline &bull; Freedom</p>
          <p className="text-sm text-[#888] mt-4">Create your account to get started</p>
          <p className="text-xs text-[#666] mt-1">You&apos;ll complete a quick intake form after signup</p>
        </div>

        <form onSubmit={handleSignup} className="bg-[#141414] rounded-xl p-8 border border-[#2a2a2a]">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm text-[#888] mb-1.5">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white placeholder-[#555]"
                placeholder="Bryan"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-[#888] mb-1.5">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white placeholder-[#555]"
                placeholder="Antonelli"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-[#888] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white placeholder-[#555]"
              placeholder="you@email.com"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-[#888] mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white placeholder-[#555]"
              placeholder="Min 6 characters"
              required
              minLength={6}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm text-[#888] mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white placeholder-[#555]"
              placeholder="Confirm password"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#FF6A00] hover:bg-[#FF8533] text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-[#555] text-xs mt-6">
          Already have an account?{' '}
          <a href="/login" className="text-[#FF6A00] hover:underline">Sign In</a>
        </p>

        <p className="text-center text-[#444] text-[10px] mt-4">
          By creating an account you agree to receive coaching communications from Forged by Freedom.
        </p>
      </div>
    </div>
  )
}

'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const supabase = createClient()

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/confirm`,
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setSuccess('Check your email for a confirmation link to complete signup.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
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
          <img src="/logo.png" alt="Forged By Freedom" className="h-24 mx-auto mb-4" />
          <h1 className="text-4xl font-black text-white tracking-widest">FORGED BY FREEDOM</h1>
          <p className="text-xs text-[#D4A017] font-semibold tracking-[0.3em] uppercase mt-2">Strength &bull; Discipline &bull; Freedom</p>
        </div>

        <form onSubmit={handleLogin} className="bg-[#141414] rounded-xl p-8 border border-[#2a2a2a]">
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                mode === 'login'
                  ? 'bg-[#FF6A00] text-white'
                  : 'bg-[#1a1a1a] text-[#888] hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                mode === 'signup'
                  ? 'bg-[#FF6A00] text-white'
                  : 'bg-[#1a1a1a] text-[#888] hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-sm text-[#888] mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white placeholder-[#555]"
              placeholder='you@email.com'
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm text-[#888] mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white placeholder-[#555]"
              placeholder="••••••••"
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
            className="w-full py-3 bg-[#FF6A00] hover:bg-[#FF8533] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? (mode === 'signup' ? 'Creating account...' : 'Signing in...')
              : (mode === 'signup' ? 'Create Account' : 'Sign In')
            }
          </button>
        </form>

        <p className="text-center text-[#555] text-xs mt-6">
          Are you a client?{' '}
          <a href="/portal" className="text-[#FF6A00] hover:underline">Go to Client Portal</a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6A00]"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

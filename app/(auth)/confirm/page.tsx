'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ConfirmPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.push('/')
        router.refresh()
      }
    })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6A00] mx-auto mb-4"></div>
        <p className="text-[#888]">Confirming your account...</p>
      </div>
    </div>
  )
}

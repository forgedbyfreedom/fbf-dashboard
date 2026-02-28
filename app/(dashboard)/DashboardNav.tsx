'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface DashboardNavProps {
  userName: string
  orgName: string
  role: string
}

export default function DashboardNav({ userName, orgName, role }: DashboardNavProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const links = [
    { href: '/', label: 'Dashboard' },
    ...(role === 'org_admin' ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <nav className="border-b border-[#2a2a2a] bg-[#141414]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Forged By Freedom"
                className="h-10"
              />
              <div className="hidden md:block">
                <p className="text-sm font-bold text-white tracking-wide leading-tight">FORGED BY FREEDOM</p>
                <p className="text-[10px] text-[#D4A017] tracking-widest uppercase leading-tight">Strength & Nutrition</p>
              </div>
            </div>
            <div className="flex gap-1">
              {links.map(link => (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-[#FF6A00]/10 text-[#FF6A00]'
                      : 'text-[#888] hover:text-white'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-white">{userName}</p>
              <p className="text-xs text-[#555]">{orgName}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 text-xs text-[#888] hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

'use client'

import { useRouter, usePathname } from 'next/navigation'
import ProfileMenu from '@/components/dashboard/ProfileMenu'

interface DashboardNavProps {
  userName: string
  orgName: string
  role: string
  avatarUrl?: string | null
}

export default function DashboardNav({ userName, orgName, role, avatarUrl }: DashboardNavProps) {
  const router = useRouter()
  const pathname = usePathname()

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/chat', label: 'Accountability Chat' },
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
                <p className="text-sm font-black text-white tracking-widest leading-tight">FORGED BY FREEDOM</p>
                <p className="text-[10px] text-[#D4A017] font-semibold tracking-[0.2em] uppercase leading-tight">Strength &bull; Discipline &bull; Freedom</p>
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
              <a
                href="https://forgedbyfreedom.org/ai-coach"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg text-sm font-medium text-[#D4A017] hover:text-[#FF6A00] transition-colors"
              >
                Bloodwork AI
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-white">{userName}</p>
              <p className="text-xs text-[#555]">{orgName}</p>
            </div>
            <ProfileMenu userName={userName} avatarUrl={avatarUrl} />
          </div>
        </div>
      </div>
    </nav>
  )
}

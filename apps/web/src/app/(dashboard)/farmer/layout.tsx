'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, MapPin, Wheat, LogOut, CreditCard } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

const NAV = [
  { href: '/farmer', label: 'Dashboard', Icon: LayoutDashboard, exact: true },
  { href: '/farmer/farms', label: 'My Farms', Icon: MapPin, exact: false },
  { href: '/farmer/loans', label: 'Loans', Icon: CreditCard, exact: false },
] as const

function LogoutButton() {
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    await logout()
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-green-900 hover:text-white disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  )
}

function FarmerUser() {
  const user = useAuthStore((s) => s.user)
  if (!user) return null
  const initials = (user.fullName ?? user.phone ?? 'F')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex items-center gap-3 px-3 py-3 border-b border-green-900/60">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
        {initials}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{user.fullName ?? user.phone}</p>
        <p className="text-xs text-green-400 capitalize">Farmer</p>
      </div>
    </div>
  )
}

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-60 flex-shrink-0 bg-green-950 text-white flex flex-col">
        <div className="p-6 border-b border-green-900/60">
          <div className="flex items-center gap-2">
            <Wheat className="h-5 w-5 text-green-400" />
            <span className="text-lg font-bold text-white">AgroConnect</span>
          </div>
          <p className="text-xs text-green-500 mt-0.5">Farmer Portal</p>
        </div>

        <FarmerUser />

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-green-700 text-white font-medium'
                    : 'text-green-200 hover:bg-green-900 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-green-900/60 px-3 py-3">
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

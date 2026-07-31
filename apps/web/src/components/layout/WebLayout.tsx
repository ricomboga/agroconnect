'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useQueryClient } from '@tanstack/react-query'

interface NavLink {
  label: string
  href: string
  active?: boolean
}

interface SidebarItem {
  label: string
  href: string
  badge?: number
}

interface WebLayoutProps {
  children: React.ReactNode
  portalName: string
  activeNav?: string
  activeSidebarItem?: string
  navLinks?: NavLink[]
  sidebarItems?: SidebarItem[]
}

export function WebLayout({
  children,
  portalName,
  navLinks = [],
  sidebarItems = [],
  activeSidebarItem,
}: WebLayoutProps) {
  const logout = useAuthStore((s) => s.logout)
  const queryClient = useQueryClient()

  async function handleLogout() {
    await logout()
    queryClient.clear()
    window.location.href = '/login'
  }

  return (
    <div className="flex flex-col h-screen">
      <nav className="w-nav shrink-0">
        <span className="text-white font-bold text-2xl mr-6">
          🌱 AgroConnect {portalName}
        </span>
        <div className="flex items-center gap-4 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-md transition-colors',
                link.active
                  ? 'text-white font-semibold'
                  : 'text-white/70 hover:text-white',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="group relative">
          <button
            type="button"
            className="bg-[#C9A84C] text-white text-md font-semibold px-3 py-1 rounded-[3px]"
          >
            Account ▾
          </button>
          <div className="absolute right-0 top-full z-10 hidden min-w-[120px] rounded-[3px] border border-gray-200 bg-white py-1 shadow-md group-hover:block">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-sidebar">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'w-sidebar-item',
                activeSidebarItem === item.href && 'active',
              )}
            >
              <span className="flex-1">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="bg-[#DC2626] text-white text-xs font-semibold rounded-lg px-1 min-w-[14px] text-center">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </aside>

        <main className="flex-1 overflow-y-auto bg-white" style={{ padding: '14px 16px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

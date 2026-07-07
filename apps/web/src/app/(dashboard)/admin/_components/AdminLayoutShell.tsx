'use client'

import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { WebLayout } from '@/components/layout/WebLayout'
import { useAuthStore } from '@/stores/authStore'

interface Props {
  children: React.ReactNode
}

const SIDEBAR_ITEMS_BASE = [
  { label: '📊 Dashboard',     href: '/admin' },
  { label: '👤 All Users',     href: '/admin/users' },
  { label: '➕ Create New',    href: '/admin/users/new' },
  { label: '🧑‍🌾 Farmers',      href: '/admin/users?role=farmer' },
  { label: '🏦 Lenders',       href: '/admin/users?role=lender' },
  { label: '📦 Suppliers',     href: '/admin/users?role=supplier' },
  { label: '🏛 Govt Officers',  href: '/admin/users?role=govt_officer' },
  { label: '🪪 KYC Queue',      href: '/admin/kyc' },
  { label: '⚠️ Moderation',    href: '/admin/moderation' },
  { label: '🌾 Farm Registry', href: '/admin/farms' },
  { label: '🏛 Programs',      href: '/admin/programs' },
  { label: '📈 Analytics',     href: '/admin/analytics' },
  { label: '⚙️ Settings',      href: '/admin/settings' },
] as const

export function AdminLayoutShell({ children }: Props) {
  const pathname = usePathname()
  const isSuperAdmin = useAuthStore((s) => s.user?.isSuperAdmin ?? false)
  const staffRole = useAuthStore((s) => s.user?.staffRole ?? 'admin')
  const canModerate = isSuperAdmin || staffRole === 'admin' || staffRole === 'moderator'

  const { data: flaggedCount = 0 } = useQuery({
    queryKey: ['admin', 'moderation', 'count'],
    queryFn: async () => {
      const res = await api.get<{ meta: { total: number } }>('/api/v1/admin/moderation')
      return res.data.meta?.total ?? 0
    },
    refetchInterval: 30_000,
    enabled: canModerate,
  })

  const visibleItems =
    !isSuperAdmin && staffRole === 'moderator'
      ? SIDEBAR_ITEMS_BASE.filter((item) => item.href === '/admin' || item.href === '/admin/moderation')
      : !isSuperAdmin && staffRole === 'county_admin'
        ? SIDEBAR_ITEMS_BASE.filter((item) => item.href !== '/admin/moderation')
        : SIDEBAR_ITEMS_BASE

  const sidebarItems = visibleItems.map((item) =>
    item.href === '/admin/moderation' ? { ...item, badge: flaggedCount } : item,
  )

  const navLinks = [
    { label: 'Dashboard', href: '/admin',            active: pathname === '/admin' },
    { label: 'Users',     href: '/admin/users',      active: pathname.startsWith('/admin/users') },
    { label: "Gov't",     href: '/admin/government', active: false },
    { label: 'Reports',   href: '/admin/reports',    active: false },
  ]

  const activeSidebarItem = [...sidebarItems]
    .sort((a, b) => b.href.split('?')[0].length - a.href.split('?')[0].length)
    .find((item) => {
      const itemPath = item.href.split('?')[0]
      if (itemPath === '/admin') return pathname === '/admin'
      return pathname.startsWith(itemPath)
    })?.href

  return (
    <WebLayout
      portalName="Admin"
      navLinks={navLinks}
      sidebarItems={sidebarItems}
      activeSidebarItem={activeSidebarItem}
    >
      {children}
    </WebLayout>
  )
}

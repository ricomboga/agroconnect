'use client'

import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { WebLayout } from '@/components/layout/WebLayout'

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
  { label: '⚠️ Moderation',    href: '/admin/moderation' },
  { label: '⚙️ Settings',      href: '/admin/settings' },
] as const

export function AdminLayoutShell({ children }: Props) {
  const pathname = usePathname()

  const { data: flaggedCount = 0 } = useQuery({
    queryKey: ['admin', 'moderation', 'count'],
    queryFn: async () => {
      const res = await api.get<{ meta: { total: number } }>('/api/v1/admin/moderation/flagged')
      return res.data.meta?.total ?? 0
    },
    refetchInterval: 30_000,
  })

  const sidebarItems = SIDEBAR_ITEMS_BASE.map((item) =>
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

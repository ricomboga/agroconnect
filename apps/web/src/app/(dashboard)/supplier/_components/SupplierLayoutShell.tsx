'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { TopBar, Sidebar, PageLayout } from '@agroconnect/web-ui'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

interface Props {
  children: React.ReactNode
}

interface SupplierSummary {
  activeProductCount: number
  lowStockCount: number
  lowStockItems: unknown[]
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

export function SupplierLayoutShell({ children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  // NOTE: pending-order count drives the "Orders" sidebar badge, mirroring the
  // wireframe's static "7" badge with live data from the supplier summary/orders endpoints.
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['supplier', 'orders', 'pending-count'],
    queryFn: async () => {
      const res = await api.get<{ meta: { total: number } }>('/api/supplier/suppliers/me/orders', {
        params: { status: 'pending', page: 1, page_size: 1 },
      })
      return res.data.meta?.total ?? 0
    },
    refetchInterval: 30_000,
  })

  const navLinks = [
    { label: 'Dashboard', href: '/supplier', active: pathname === '/supplier' },
    { label: 'Catalogue', href: '/supplier/catalogue', active: pathname.startsWith('/supplier/catalogue') },
    { label: 'Orders', href: '/supplier/orders', active: pathname.startsWith('/supplier/orders') },
    { label: 'Customers', href: '/supplier/customers', active: pathname.startsWith('/supplier/customers') },
    { label: 'Profile & Reviews', href: '/supplier/profile', active: pathname.startsWith('/supplier/profile') },
  ]

  const sections = [
    {
      title: 'Overview',
      items: [{ label: '📊 Dashboard', href: '/supplier', active: pathname === '/supplier' }],
    },
    {
      title: 'Catalogue',
      items: [
        { label: '📦 All Products', href: '/supplier/catalogue', active: pathname === '/supplier/catalogue' },
        { label: '➕ Add Product', href: '/supplier/catalogue/new', active: pathname === '/supplier/catalogue/new' },
      ],
    },
    {
      title: 'Sales',
      items: [
        {
          label: '🛒 Orders',
          href: '/supplier/orders',
          active: pathname.startsWith('/supplier/orders'),
          ...(pendingCount > 0 ? { badge: pendingCount } : {}),
        },
        { label: '👥 Customers', href: '/supplier/customers', active: pathname === '/supplier/customers' },
        { label: '⭐ Profile & Reviews', href: '/supplier/profile', active: pathname === '/supplier/profile' },
      ],
    },
  ]

  // TODO(real-data): no SupplierProfile model exists yet — business name isn't
  // available from the JWT/AuthUser shape, so fall back to the account's full name.
  const displayName = user?.fullName ?? 'Supplier'

  return (
    <PageLayout
      topBar={
        <TopBar
          portalLabel="Supplier / Agrovet Portal"
          navLinks={navLinks}
          user={{ name: displayName, initials: initialsOf(displayName) }}
          onLogout={() => {
            void logout().then(() => router.push('/login'))
          }}
        />
      }
      sidebar={<Sidebar sections={sections} />}
    >
      {children}
    </PageLayout>
  )
}

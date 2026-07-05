'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { TopBar, Sidebar, PageLayout } from '@agroconnect/web-ui'
import type { SidebarSection } from '@agroconnect/web-ui'

interface Props {
  children: React.ReactNode
}

interface ApplicationsResponse {
  data: unknown[]
  meta: { total: number }
}

const TOP_NAV = [
  { label: 'Dashboard', href: '/govt' },
  { label: 'Applications', href: '/govt/applications' },
  { label: 'New Program', href: '/govt/programs/new' },
  { label: 'Farm Registry', href: '/govt/registrations' },
  { label: 'Reports', href: '/govt/reports' },
] as const

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/govt') return pathname === '/govt'
  return pathname.startsWith(href)
}

export function GovtLayoutShell({ children }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['govt', 'subsidies', 'applications', 'pending-count'],
    queryFn: async () => {
      const res = await fetch('/api/govt/subsidies/applications?status=submitted&page_size=1')
      if (!res.ok) return 0
      const body = (await res.json()) as ApplicationsResponse
      return body.meta?.total ?? 0
    },
    refetchInterval: 30_000,
  })

  const navLinks = TOP_NAV.map((item) => ({
    ...item,
    active: isActivePath(pathname, item.href),
  }))

  const sections: SidebarSection[] = [
    {
      title: '',
      items: [{ label: '📊 County Dashboard', href: '/govt', active: pathname === '/govt' }],
    },
    {
      title: 'Subsidies',
      items: [
        {
          label: '📋 Applications',
          href: '/govt/applications',
          active: pathname.startsWith('/govt/applications'),
          badge: pendingCount > 0 ? pendingCount : undefined,
        },
      ],
    },
    {
      title: 'Programs',
      items: [
        {
          label: '➕ New Program',
          href: '/govt/programs/new',
          active: pathname.startsWith('/govt/programs'),
        },
      ],
    },
    {
      title: 'Registry',
      items: [
        {
          label: '🗺️ Farm Registry',
          href: '/govt/registrations',
          active: pathname.startsWith('/govt/registrations'),
        },
        {
          label: '📤 County Reports',
          href: '/govt/reports',
          active: pathname.startsWith('/govt/reports'),
        },
      ],
    },
  ]

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <PageLayout
      topBar={
        <TopBar
          portalLabel="Government Portal"
          navLinks={navLinks}
          user={{ name: 'Government Officer', initials: 'GO' }}
          onLogout={handleLogout}
        />
      }
      sidebar={<Sidebar sections={sections} />}
    >
      {children}
    </PageLayout>
  )
}

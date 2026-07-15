'use client'

import { usePathname } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TopBar, Sidebar, PageLayout } from '@agroconnect/web-ui'
import type { SidebarSection } from '@agroconnect/web-ui'

interface Props {
  children: React.ReactNode
}

export type InstitutionType = 'bank' | 'microfinance' | 'sacco' | 'mobile_lender' | 'ngo_grant'

interface Institution {
  id: string
  name: string
  type: InstitutionType
}

function isActivePath(pathname: string, href: string): boolean {
  return pathname.startsWith(href)
}

export function LenderLayoutShell({ children }: Props) {
  const pathname = usePathname()
  const queryClient = useQueryClient()

  const { data: institution } = useQuery({
    queryKey: ['lender', 'institution'],
    queryFn: async () => {
      const res = await fetch('/api/lender/institution')
      if (!res.ok) return null
      const body = (await res.json()) as { data: Institution }
      return body.data
    },
  })

  const isNgo = institution?.type === 'ngo_grant'

  const navLinks = [
    { label: 'Dashboard', href: '/lender', active: pathname === '/lender' },
    { label: isNgo ? 'Grant Pipeline' : 'Loan Pipeline', href: '/lender/pipeline', active: isActivePath(pathname, '/lender/pipeline') },
    { label: isNgo ? 'Disbursed Grants' : 'Portfolio', href: '/lender/portfolio', active: isActivePath(pathname, '/lender/portfolio') },
    { label: 'Farmer Reports', href: '/lender/farmer-reports', active: isActivePath(pathname, '/lender/farmer-reports') },
    { label: 'Reports', href: '/lender/reports', active: isActivePath(pathname, '/lender/reports') },
    { label: isNgo ? 'Impact Analytics' : 'Risk Analytics', href: '/lender/risk', active: isActivePath(pathname, '/lender/risk') },
    ...(isNgo ? [{ label: 'Add Farmer', href: '/lender/farmers/new', active: isActivePath(pathname, '/lender/farmers') }] : []),
  ]

  const sections: SidebarSection[] = [
    {
      title: 'Overview',
      items: [
        { label: '🏠 Dashboard', href: '/lender', active: pathname === '/lender' },
      ],
    },
    {
      title: 'Applications',
      items: [
        {
          label: isNgo ? '📋 Grant Pipeline' : '📋 Loan Pipeline',
          href: '/lender/pipeline',
          active: isActivePath(pathname, '/lender/pipeline'),
        },
      ],
    },
    {
      title: isNgo ? 'Grants' : 'Portfolio',
      items: [
        {
          label: isNgo ? '💰 Disbursed Grants' : '💰 Portfolio',
          href: '/lender/portfolio',
          active: isActivePath(pathname, '/lender/portfolio'),
        },
        ...(isNgo
          ? [{ label: '🌾 Input Distribution', href: '/lender/input-distribution', active: isActivePath(pathname, '/lender/input-distribution') }]
          : []),
      ],
    },
    {
      title: 'Reports',
      items: [
        {
          label: '🧑‍🌾 Farmer Reports',
          href: '/lender/farmer-reports',
          active: isActivePath(pathname, '/lender/farmer-reports'),
        },
        {
          label: '📑 General Reports',
          href: '/lender/reports',
          active: isActivePath(pathname, '/lender/reports'),
        },
        ...(isNgo
          ? [{ label: '➕ Add Farmer', href: '/lender/farmers/new', active: isActivePath(pathname, '/lender/farmers') }]
          : []),
      ],
    },
    {
      title: 'Tools',
      items: [
        {
          label: isNgo ? '📈 Impact Analytics' : '📈 Risk Analytics',
          href: '/lender/risk',
          active: isActivePath(pathname, '/lender/risk'),
        },
        ...(isNgo
          ? [{ label: '🌱 Grant Programs', href: '/lender/grants', active: isActivePath(pathname, '/lender/grants') }]
          : [{ label: '📦 Products', href: '/lender/products', active: isActivePath(pathname, '/lender/products') }]),
        { label: '⚙️ Settings', href: '/lender/settings', active: isActivePath(pathname, '/lender/settings') },
      ],
    },
  ]

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    // Clear the cached data from this session before navigating — the
    // QueryClient outlives client-side route transitions, so without this
    // the next login in the same tab would briefly render this account's
    // stale cached data. A hard navigation (not router.push) also
    // guarantees every other in-memory client store resets.
    queryClient.clear()
    window.location.href = '/login'
  }

  return (
    <PageLayout
      topBar={
        <TopBar
          portalLabel="Lender"
          navLinks={navLinks}
          user={{ name: institution?.name ?? 'Lending Partner', initials: isNgo ? 'NGO' : 'LP' }}
          onLogout={handleLogout}
          badge={
            isNgo
              ? { label: '🌱 NGO / Grant Provider', className: 'bg-ac-purple-light text-ac-purple' }
              : { label: '🏦 Commercial Lender', className: 'bg-ac-blue-light text-ac-blue' }
          }
        />
      }
      sidebar={<Sidebar sections={sections} />}
    >
      {children}
    </PageLayout>
  )
}

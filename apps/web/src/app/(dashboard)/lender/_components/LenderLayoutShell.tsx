'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
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
  const router = useRouter()

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
    { label: isNgo ? 'Grant Pipeline' : 'Loan Pipeline', href: '/lender/pipeline', active: isActivePath(pathname, '/lender/pipeline') },
    { label: isNgo ? 'Disbursed Grants' : 'Portfolio', href: '/lender/portfolio', active: isActivePath(pathname, '/lender/portfolio') },
    { label: 'Farmer Reports', href: '/lender/farmer-reports', active: isActivePath(pathname, '/lender/farmer-reports') },
    { label: isNgo ? 'Impact Analytics' : 'Risk Analytics', href: '/lender/risk', active: isActivePath(pathname, '/lender/risk') },
  ]

  const sections: SidebarSection[] = [
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
    router.push('/login')
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

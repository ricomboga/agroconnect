import Link from 'next/link'
import { cn } from '@/lib/utils'

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
  return (
    <div className="flex flex-col h-screen">
      <nav className="w-nav shrink-0">
        <span className="text-white font-bold text-[14px] mr-6">
          🌱 AgroConnect {portalName}
        </span>
        <div className="flex items-center gap-4 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-[10px] transition-colors',
                link.active
                  ? 'text-white font-semibold'
                  : 'text-white/70 hover:text-white',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <button className="bg-[#C9A84C] text-white text-[10px] font-semibold px-3 py-1 rounded-[3px]">
          Account ▾
        </button>
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
                <span className="bg-[#DC2626] text-white text-[7px] font-semibold rounded-lg px-1 min-w-[14px] text-center">
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

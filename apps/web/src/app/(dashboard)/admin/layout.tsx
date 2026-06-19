import Link from 'next/link'
import { BarChart3, Users, ShieldAlert } from 'lucide-react'
import { ModerationCountBadge } from '@/components/admin/ModerationCountBadge'
import { LogoutButton } from './_components/LogoutButton'

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', Icon: BarChart3 },
  { href: '/admin/users', label: 'Users', Icon: Users },
] as const

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-60 flex-shrink-0 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-lg font-bold text-green-400">AgroConnect</h1>
          <p className="text-xs text-gray-500 mt-0.5">Admin Portal</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <Link
            href="/admin/moderation"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Moderation</span>
            <ModerationCountBadge />
          </Link>
        </nav>
        <div className="border-t border-gray-800 px-3 py-3">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  )
}

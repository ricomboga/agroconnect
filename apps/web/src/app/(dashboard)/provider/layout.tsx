import Link from 'next/link'
import { UserCircle, ClipboardList, Users } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/provider/profile', label: 'My Profile', Icon: UserCircle },
  { href: '/provider/clients', label: 'Clients', Icon: Users },
  { href: '/provider/register', label: 'Registration', Icon: ClipboardList },
] as const

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-60 flex-shrink-0 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-lg font-bold text-green-400">AgroConnect</h1>
          <p className="text-xs text-gray-500 mt-0.5">Provider Portal</p>
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
        </nav>
        <div className="px-4 py-3 border-t border-gray-800">
          <p className="text-xs text-gray-500">Service Provider Portal</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  )
}

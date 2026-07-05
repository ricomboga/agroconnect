import { cn } from '../lib/cn'

export interface TopBarNavLink {
  label: string
  href: string
  active?: boolean
}

export interface TopBarUser {
  name: string
  initials: string
}

export interface TopBarBadge {
  label: string
  className?: string
}

export interface TopBarProps {
  portalLabel: string
  navLinks: TopBarNavLink[]
  user: TopBarUser
  onLogout?: () => void
  badge?: TopBarBadge
}

export function TopBar({ portalLabel, navLinks, user, onLogout, badge }: TopBarProps) {
  return (
    <header className="flex h-10 shrink-0 items-center gap-6 bg-ac-green-dark px-4">
      <span className="text-2xl font-bold text-white">🌱 AgroConnect {portalLabel}</span>

      {badge && (
        <span
          className={cn(
            'rounded-pill px-2 py-0.5 text-xs font-bold',
            badge.className ?? 'bg-white/20 text-white',
          )}
        >
          {badge.label}
        </span>
      )}

      <nav className="flex flex-1 items-center gap-4">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={cn(
              'text-md transition-colors',
              link.active ? 'font-semibold text-white' : 'text-white/70 hover:text-white',
            )}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="group relative">
        <button
          type="button"
          className="flex items-center gap-2 rounded-md bg-gold px-3 py-1 text-md font-semibold text-white"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
            {user.initials}
          </span>
          {user.name}
          <span aria-hidden>▾</span>
        </button>

        {onLogout && (
          <div className="absolute right-0 top-full z-10 hidden min-w-[120px] rounded-base border border-border bg-white py-1 shadow-card group-hover:block">
            <button
              type="button"
              onClick={onLogout}
              className="w-full px-3 py-1.5 text-left text-base text-ink hover:bg-surface2"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

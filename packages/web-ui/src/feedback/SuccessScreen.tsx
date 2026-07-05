export interface SuccessScreenCredential {
  label: string
  value: string
}

export interface SuccessScreenAction {
  label: string
  href: string
}

export interface SuccessScreenProps {
  title: string
  sub?: string
  credentials?: SuccessScreenCredential[]
  nextActions?: SuccessScreenAction[]
}

export function SuccessScreen({ title, sub, credentials, nextActions }: SuccessScreenProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="text-[52px] leading-none" aria-hidden>
        ✅
      </div>

      <h2 className="text-2xl font-bold text-ink">{title}</h2>
      {sub && <p className="max-w-sm text-base text-muted">{sub}</p>}

      {credentials && credentials.length > 0 && (
        <div className="mt-2 w-full max-w-sm rounded-base bg-ac-green-dark p-3 text-left">
          {credentials.map((cred) => (
            <div key={cred.label} className="flex items-center justify-between py-1">
              <span className="text-sm text-white/70">{cred.label}</span>
              <span className="text-base font-semibold text-white">{cred.value}</span>
            </div>
          ))}
        </div>
      )}

      {nextActions && nextActions.length > 0 && (
        <div className="mt-3 flex gap-2">
          {nextActions.map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="rounded-md bg-ac-green px-3 py-1.5 text-base font-semibold text-white"
            >
              {action.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

import type { ReactNode } from 'react'

export interface AssignmentPanelAction {
  label: string
  onClick: () => void
}

export interface AssignmentPanelProps {
  title: string
  color?: string
  actions: AssignmentPanelAction[]
  children?: ReactNode
}

export function AssignmentPanel({ title, color, actions, children }: AssignmentPanelProps) {
  return (
    <div className="rounded-base border border-ac-blue bg-ac-blue-light px-4 py-3.5">
      <h4 className="mb-1.5 text-xl font-bold" style={color ? { color } : undefined}>
        <span className={color ? undefined : 'text-ac-blue'}>{title}</span>
      </h4>

      {children && <div className="mb-2 text-base text-ink2">{children}</div>}

      <div className="flex flex-row gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="rounded-md bg-ac-blue px-3 py-1.5 text-sm font-semibold text-white"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}

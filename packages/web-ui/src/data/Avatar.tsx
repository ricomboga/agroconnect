import { cn } from '../lib/cn'

export interface AvatarProps {
  initials: string
  color?: string
}

export function Avatar({ initials, color }: AvatarProps) {
  return (
    <span
      className={cn(
        'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-xl font-bold text-white',
        !color && 'bg-ac-green',
      )}
      style={color ? { backgroundColor: color } : undefined}
    >
      {initials}
    </span>
  )
}

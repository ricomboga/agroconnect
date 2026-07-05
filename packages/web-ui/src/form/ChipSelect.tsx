import { cn } from '../lib/cn'

export interface ChipSelectOption {
  value: string
  label: string
}

export interface ChipSelectPropsSingle {
  options: ChipSelectOption[]
  multiple?: false
  value: string | undefined
  onChange: (value: string) => void
}

export interface ChipSelectPropsMultiple {
  options: ChipSelectOption[]
  multiple: true
  value: string[]
  onChange: (value: string[]) => void
}

export type ChipSelectProps = ChipSelectPropsSingle | ChipSelectPropsMultiple

export function ChipSelect(props: ChipSelectProps) {
  const { options } = props

  const isActive = (optionValue: string): boolean =>
    props.multiple ? props.value.includes(optionValue) : props.value === optionValue

  const handleClick = (optionValue: string): void => {
    if (props.multiple) {
      const next = props.value.includes(optionValue)
        ? props.value.filter((v) => v !== optionValue)
        : [...props.value, optionValue]
      props.onChange(next)
    } else {
      props.onChange(optionValue)
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => handleClick(option.value)}
          className={cn(
            'rounded-pill border px-3 py-1 text-sm font-semibold transition-colors',
            isActive(option.value)
              ? 'border-ac-green bg-ac-green text-white'
              : 'border-border bg-white text-ink2 hover:bg-surface2',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

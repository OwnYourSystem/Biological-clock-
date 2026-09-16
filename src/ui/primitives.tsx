import clsx from 'clsx'
import type { ReactNode } from 'react'

/**
 * The component bricks. Long Tailwind strings live in here and nowhere else,
 * so screens read as structure. Black surfaces, one blue accent, big targets.
 */

export function Card({
  children,
  className,
  tone = 'default',
}: {
  children: ReactNode
  className?: string
  tone?: 'default' | 'accent' | 'quiet'
}) {
  return (
    <section
      className={clsx(
        'rounded-card border p-4',
        tone === 'default' && 'border-ink-700 bg-ink-850',
        tone === 'accent' && 'border-brand-700 bg-brand-900',
        tone === 'quiet' && 'border-ink-800 bg-ink-900',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-ink-200 uppercase">{children}</h2>
      {hint ? <span className="text-sm text-ink-400">{hint}</span> : null}
    </div>
  )
}

export function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled,
  tone = 'brand',
  className,
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  tone?: 'brand' | 'quiet' | 'alert'
  className?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'min-h-14 w-full rounded-card px-5 text-lg font-semibold transition active:scale-[0.99]',
        'disabled:opacity-40 disabled:active:scale-100',
        tone === 'brand' && 'bg-brand-500 text-white',
        tone === 'quiet' && 'border border-ink-600 bg-ink-800 text-ink-100',
        tone === 'alert' && 'bg-alert-500 text-white',
        className,
      )}
    >
      {children}
    </button>
  )
}

export interface ChipOption<T extends string> {
  value: T
  label: string
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  columns = 4,
  disabled,
}: {
  options: ChipOption<T>[]
  value: T | null
  onChange: (value: T) => void
  columns?: 2 | 3 | 4
  disabled?: boolean
}) {
  return (
    <div
      className={clsx(
        'grid gap-2',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-3',
        columns === 4 && 'grid-cols-4',
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={clsx(
            'min-h-14 rounded-2xl border px-2 text-base font-medium transition active:scale-[0.97]',
            'disabled:opacity-40',
            value === option.value
              ? 'border-brand-400 bg-brand-500 text-white'
              : 'border-ink-600 bg-ink-800 text-ink-100',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function TimeInput({
  value,
  onChange,
  label,
}: {
  value: string | null
  onChange: (value: string) => void
  label: string
}) {
  return (
    <label className="flex-1">
      <span className="mb-1 block text-sm text-ink-400">{label}</span>
      <input
        type="time"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-14 w-full rounded-2xl border border-ink-600 bg-ink-800 px-3 text-xl tabular-nums"
      />
    </label>
  )
}

export function NumberInput({
  value,
  onChange,
  suffix,
  placeholder,
  step = 1,
  disabled,
}: {
  value: number | null
  onChange: (value: number | null) => void
  suffix?: string
  placeholder?: string
  step?: number
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="decimal"
        step={step}
        disabled={disabled}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
        className="min-h-14 w-full rounded-2xl border border-ink-600 bg-ink-800 px-4 text-xl tabular-nums disabled:opacity-40"
      />
      {suffix ? <span className="shrink-0 text-lg text-ink-300">{suffix}</span> : null}
    </div>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-14 w-full rounded-2xl border border-ink-600 bg-ink-800 px-4 text-base"
    />
  )
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 10,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={1}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-12 w-full"
    />
  )
}

export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode
  tone?: 'info' | 'warn'
}) {
  return (
    <p
      className={clsx(
        'rounded-2xl border px-4 py-3 text-sm leading-relaxed',
        tone === 'info' && 'border-brand-800 bg-brand-900 text-brand-200',
        tone === 'warn' && 'border-warn-500/40 bg-warn-500/10 text-warn-500',
      )}
    >
      {children}
    </p>
  )
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="px-1">
      <h1 className="text-2xl font-semibold text-ink-50">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-ink-400">{subtitle}</p> : null}
    </header>
  )
}

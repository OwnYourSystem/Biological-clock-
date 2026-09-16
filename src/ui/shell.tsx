import clsx from 'clsx'
import type { ReactNode } from 'react'

export type Route =
  | 'today'
  | 'episode'
  | 'week'
  | 'lag'
  | 'more'
  | 'labs'
  | 'meds'
  | 'export'
  | 'report'
  | 'settings'

export function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pt-5 pb-36">{children}</main>
  )
}

function NavButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex min-h-14 flex-1 flex-col items-center justify-center rounded-2xl text-sm font-medium transition',
        active ? 'bg-ink-800 text-brand-300' : 'text-ink-400',
      )}
    >
      {label}
    </button>
  )
}

/**
 * Fixed bottom bar, thumb-reachable, on every screen. The episode button sits
 * in the middle and is always 1 tap away, which is the first hard requirement
 * in the spec.
 */
export function BottomBar({
  route,
  onNavigate,
}: {
  route: Route
  onNavigate: (route: Route) => void
}) {
  const onMore = ['more', 'labs', 'meds', 'export', 'report', 'settings'].includes(route)

  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-ink-700 bg-ink-950/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-lg items-center gap-1 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <NavButton label="Today" active={route === 'today'} onClick={() => onNavigate('today')} />
        <NavButton label="Week" active={route === 'week'} onClick={() => onNavigate('week')} />
        <button
          type="button"
          onClick={() => onNavigate('episode')}
          aria-label="Log an episode now"
          className={clsx(
            '-mt-8 flex size-20 shrink-0 flex-col items-center justify-center rounded-full border-4 border-ink-950 text-center text-sm font-bold leading-tight text-white shadow-lg transition active:scale-95',
            route === 'episode' ? 'bg-brand-400' : 'bg-brand-500',
          )}
        >
          Episode
        </button>
        <NavButton label="Lag" active={route === 'lag'} onClick={() => onNavigate('lag')} />
        <NavButton label="More" active={onMore} onClick={() => onNavigate('more')} />
      </div>
    </nav>
  )
}

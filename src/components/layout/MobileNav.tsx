import type { AppTab } from '../../types'

type Props = {
  active: AppTab
  onNavigate: (tab: AppTab) => void
}

const ITEMS: { tab: AppTab; label: string; icon: string }[] = [
  { tab: 'market', label: 'Market', icon: '⌂' },
  { tab: 'scanner', label: 'Scan', icon: '◎' },
  { tab: 'watchlist', label: 'Watch', icon: '★' },
  { tab: 'account', label: 'Account', icon: '◉' },
  { tab: 'settings', label: 'More', icon: '⋯' },
]

export function MobileNav({ active, onNavigate }: Props) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {ITEMS.map((item) => (
        <button
          key={item.tab}
          type="button"
          className={active === item.tab ? 'active' : ''}
          onClick={() => onNavigate(item.tab)}
        >
          <span className="mobile-nav-icon" aria-hidden>
            {item.icon}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

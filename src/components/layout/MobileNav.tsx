import { useEffect, useMemo, useState } from 'react'
import type { AppTab } from '../../types'

type Props = {
  active: AppTab
  onNavigate: (tab: AppTab) => void
}

const PRIMARY: { tab: AppTab; label: string; icon: string }[] = [
  { tab: 'market', label: 'Market', icon: '⌂' },
  { tab: 'scanner', label: 'Scan', icon: '◎' },
  { tab: 'watchlist', label: 'Watch', icon: '★' },
  { tab: 'account', label: 'Account', icon: '◉' },
]

const MORE: { tab: AppTab; label: string }[] = [
  { tab: 'crafts', label: 'Crafts' },
  { tab: 'calculator', label: 'Calculator' },
  { tab: 'settings', label: 'Settings' },
]

export function MobileNav({ active, onNavigate }: Props) {
  const [moreOpen, setMoreOpen] = useState(false)
  const isMoreActive = useMemo(() => MORE.some((item) => item.tab === active), [active])

  useEffect(() => {
    if (!moreOpen) return
    const close = () => setMoreOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [moreOpen])

  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {PRIMARY.map((item) => (
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

      <div className="mobile-nav-more">
        <button
          type="button"
          className={isMoreActive ? 'active' : ''}
          onClick={(event) => {
            event.stopPropagation()
            setMoreOpen((value) => !value)
          }}
        >
          <span className="mobile-nav-icon" aria-hidden>
            ⋯
          </span>
          <span>More</span>
        </button>
        {moreOpen ? (
          <div className="mobile-more-menu" onClick={(event) => event.stopPropagation()}>
            {MORE.map((item) => (
              <button
                key={item.tab}
                type="button"
                className={active === item.tab ? 'active' : ''}
                onClick={() => {
                  onNavigate(item.tab)
                  setMoreOpen(false)
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  )
}

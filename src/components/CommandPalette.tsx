import { useEffect, useMemo, useState } from 'react'
import { useItemDetail } from '../context/ItemDetailProvider'
import { searchItems } from '../lib/gw2Api'
import type { Gw2Item } from '../types'

type PaletteEntry =
  | { kind: 'nav'; id: string; label: string }
  | { kind: 'item'; item: Gw2Item }

type Props = {
  onNavigate?: (tab: string) => void
}

export function CommandPalette({ onNavigate }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Gw2Item[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const { openItem } = useItemDetail()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((value) => !value)
      }
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([])
      return
    }
    const timer = window.setTimeout(async () => {
      try {
        const items = await searchItems(query)
        setResults(items.slice(0, 8))
      } catch {
        setResults([])
      }
    }, 200)
    return () => window.clearTimeout(timer)
  }, [open, query])

  const navActions = useMemo(
    () => [
      { id: 'market', label: 'Go to Market dashboard' },
      { id: 'scanner', label: 'Go to Flip scanner' },
      { id: 'watchlist', label: 'Go to Watchlist' },
      { id: 'calculator', label: 'Go to Calculator' },
      { id: 'account', label: 'Go to Account' },
      { id: 'settings', label: 'Go to Settings' },
    ],
    [],
  )

  const entries: PaletteEntry[] = useMemo(() => {
    const filteredNav =
      query.trim().length === 0
        ? navActions
        : navActions.filter((action) => action.label.toLowerCase().includes(query.toLowerCase()))
    return [
      ...filteredNav.map((action) => ({ kind: 'nav' as const, id: action.id, label: action.label })),
      ...results.map((item) => ({ kind: 'item' as const, item })),
    ]
  }, [navActions, query, results])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, open])

  const runEntry = (entry: PaletteEntry) => {
    if (entry.kind === 'nav') {
      onNavigate?.(entry.id)
    } else {
      openItem(entry.item)
    }
    setOpen(false)
    setQuery('')
  }

  if (!open) return null

  return (
    <div className="modal-backdrop palette-backdrop" onClick={() => setOpen(false)} role="presentation">
      <div className="command-palette" onClick={(event) => event.stopPropagation()} role="dialog">
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActiveIndex((index) => Math.min(index + 1, entries.length - 1))
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex((index) => Math.max(index - 1, 0))
            }
            if (event.key === 'Enter' && entries[activeIndex]) {
              event.preventDefault()
              runEntry(entries[activeIndex])
            }
          }}
          placeholder="Search items or jump to a page… (Ctrl+K)"
        />
        <ul className="palette-results">
          {entries.map((entry, index) => (
            <li key={entry.kind === 'nav' ? entry.id : entry.item.id}>
              <button
                type="button"
                className={index === activeIndex ? 'active' : ''}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => runEntry(entry)}
              >
                {entry.kind === 'item' && entry.item.icon ? (
                  <img src={entry.item.icon} alt="" width={24} height={24} />
                ) : null}
                {entry.kind === 'nav' ? entry.label : entry.item.name}
              </button>
            </li>
          ))}
        </ul>
        <p className="hint palette-hint">↑↓ browse · Enter select · Esc close</p>
      </div>
    </div>
  )
}

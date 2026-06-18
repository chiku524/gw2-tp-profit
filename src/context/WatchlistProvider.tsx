import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadWatchlist, saveWatchlist, type WatchlistEntry } from '../lib/marketStorage'

type WatchlistContextValue = {
  entries: WatchlistEntry[]
  isWatched: (itemId: number) => boolean
  toggle: (entry: Omit<WatchlistEntry, 'addedAt'>) => void
  remove: (itemId: number) => void
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null)

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<WatchlistEntry[]>(() => loadWatchlist())

  const persist = useCallback((next: WatchlistEntry[]) => {
    setEntries(next)
    saveWatchlist(next)
  }, [])

  const isWatched = useCallback(
    (itemId: number) => entries.some((entry) => entry.itemId === itemId),
    [entries],
  )

  const toggle = useCallback(
    (entry: Omit<WatchlistEntry, 'addedAt'>) => {
      if (isWatched(entry.itemId)) {
        persist(entries.filter((row) => row.itemId !== entry.itemId))
        return
      }
      persist([{ ...entry, addedAt: new Date().toISOString() }, ...entries])
    },
    [entries, isWatched, persist],
  )

  const remove = useCallback(
    (itemId: number) => persist(entries.filter((row) => row.itemId !== itemId)),
    [entries, persist],
  )

  const value = useMemo(
    () => ({ entries, isWatched, toggle, remove }),
    [entries, isWatched, toggle, remove],
  )

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>
}

export function useWatchlist() {
  const context = useContext(WatchlistContext)
  if (!context) throw new Error('useWatchlist must be used within WatchlistProvider')
  return context
}

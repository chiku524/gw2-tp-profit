export type WatchlistEntry = {
  itemId: number
  name: string
  icon?: string
  addedAt: string
}

const STORAGE_KEY = 'gw2-tp-profit.watchlist'

export function loadWatchlist(): WatchlistEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WatchlistEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveWatchlist(entries: WatchlistEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function loadRecentItemIds(): number[] {
  try {
    const raw = localStorage.getItem('gw2-tp-profit.recent-items')
    if (!raw) return []
    const parsed = JSON.parse(raw) as number[]
    return Array.isArray(parsed) ? parsed.slice(0, 12) : []
  } catch {
    return []
  }
}

export function pushRecentItem(itemId: number): void {
  const current = loadRecentItemIds().filter((id) => id !== itemId)
  current.unshift(itemId)
  localStorage.setItem('gw2-tp-profit.recent-items', JSON.stringify(current.slice(0, 12)))
}

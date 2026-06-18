import type { AppTab, ScanFilters, ProfitMoveFilters } from '../types'

const TAB_KEY = 'gw2-tp-profit.tab'
const FILTERS_KEY = 'gw2-tp-profit.scan-filters'
const CRAFT_FILTERS_KEY = 'gw2-tp-profit.craft-filters'
const AUTO_REFRESH_KEY = 'gw2-tp-profit.watchlist-auto-refresh'
const PROFIT_MOVES_CACHE_KEY = 'gw2-tp-profit.profit-moves-cache'

export function loadPreferredTab(): AppTab {
  try {
    const value = localStorage.getItem(TAB_KEY)
    if (
      value === 'market' ||
      value === 'scanner' ||
      value === 'watchlist' ||
      value === 'calculator' ||
      value === 'crafts' ||
      value === 'account' ||
      value === 'settings'
    ) {
      return value
    }
  } catch {
    /* ignore */
  }
  return 'market'
}

export function savePreferredTab(tab: AppTab): void {
  localStorage.setItem(TAB_KEY, tab)
}

export function loadScanFilters(): ScanFilters | null {
  try {
    const raw = localStorage.getItem(FILTERS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ScanFilters
  } catch {
    return null
  }
}

export function saveScanFilters(filters: ScanFilters): void {
  localStorage.setItem(FILTERS_KEY, JSON.stringify(filters))
}

export function loadWatchlistAutoRefresh(): boolean {
  try {
    return localStorage.getItem(AUTO_REFRESH_KEY) === '1'
  } catch {
    return false
  }
}

export function saveWatchlistAutoRefresh(enabled: boolean): void {
  localStorage.setItem(AUTO_REFRESH_KEY, enabled ? '1' : '0')
}

export function loadProfitMoveFilters(): ProfitMoveFilters | null {
  try {
    const raw = localStorage.getItem(CRAFT_FILTERS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ProfitMoveFilters
  } catch {
    return null
  }
}

export function saveProfitMoveFilters(filters: ProfitMoveFilters): void {
  localStorage.setItem(CRAFT_FILTERS_KEY, JSON.stringify(filters))
}

type ProfitMovesCache = {
  savedAt: number
  moves: import('../types').ProfitMove[]
}

const PROFIT_MOVES_TTL_MS = 30 * 60_000

export function loadProfitMovesCache(): ProfitMovesCache | null {
  try {
    const raw = sessionStorage.getItem(PROFIT_MOVES_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ProfitMovesCache
    if (Date.now() - parsed.savedAt > PROFIT_MOVES_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

export function saveProfitMovesCache(moves: import('../types').ProfitMove[]): void {
  const payload: ProfitMovesCache = { savedAt: Date.now(), moves }
  sessionStorage.setItem(PROFIT_MOVES_CACHE_KEY, JSON.stringify(payload))
}

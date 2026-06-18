import type { GemExchange } from '../types'

export type GemSnapshot = {
  t: number
  coinsPerGem: number
  gems: number
}

const STORAGE_KEY = 'gw2-tp-gem-history'
const MAX_POINTS = 90

function readStore(): GemSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GemSnapshot[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStore(rows: GemSnapshot[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(-MAX_POINTS)))
  } catch {
    // ignore quota errors
  }
}

export function recordGemExchange(entries: GemExchange[]): void {
  const best = entries[0]
  if (!best?.coins_per_gem) return

  const store = readStore()
  const last = store[store.length - 1]
  const snapshot: GemSnapshot = {
    t: Date.now(),
    coinsPerGem: best.coins_per_gem,
    gems: best.gems,
  }

  if (last && last.coinsPerGem === snapshot.coinsPerGem && Date.now() - last.t < 3600_000) return

  writeStore([...store, snapshot])
}

export function getGemHistory(): GemSnapshot[] {
  return readStore()
}

export function gemTimingAdvice(history: GemSnapshot[], current: GemExchange | undefined): string {
  if (!current) return 'No live gem rate available.'
  if (history.length < 5) return 'Collecting gem history — check back after a few visits.'

  const rates = history.map((row) => row.coinsPerGem)
  const avg = rates.reduce((sum, value) => sum + value, 0) / rates.length
  const min = Math.min(...rates)
  const max = Math.max(...rates)
  const now = current.coins_per_gem

  if (now >= max * 0.98) {
    return 'Gems are near a recent high — favorable if you want gold from gems.'
  }
  if (now <= min * 1.02) {
    return 'Gems are near a recent low — better if you are buying gems with gold.'
  }
  if (now > avg * 1.05) {
    return `Above your ${history.length}-point average — decent gem → gold window.`
  }
  if (now < avg * 0.95) {
    return `Below your ${history.length}-point average — better for gold → gem.`
  }
  return 'Gem rate is near your recent average.'
}

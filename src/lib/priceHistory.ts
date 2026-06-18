import type { CommercePrice } from '../types'

export type PriceSnapshot = {
  t: number
  buy: number
  sell: number
}

const STORAGE_KEY = 'gw2-tp-price-history'
const MAX_ITEMS = 200
const MAX_POINTS_PER_ITEM = 60

type Store = Record<string, PriceSnapshot[]>

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Store
    if (!parsed || typeof parsed !== 'object') return {}
    return pruneStore(parsed)
  } catch {
    return {}
  }
}

function lastSnapshotTime(series: PriceSnapshot[]): number {
  return series[series.length - 1]?.t ?? 0
}

function pruneStore(store: Store, maxItems = MAX_ITEMS): Store {
  const keys = Object.keys(store)
  if (keys.length === 0) return store

  const trimmed: Store = {}
  for (const key of keys) {
    const series = store[key]
    if (!series?.length) continue
    trimmed[key] = series.slice(-MAX_POINTS_PER_ITEM)
  }

  const trimmedKeys = Object.keys(trimmed)
  if (trimmedKeys.length <= maxItems) return trimmed

  const keep = trimmedKeys
    .sort((a, b) => lastSnapshotTime(trimmed[a]!) - lastSnapshotTime(trimmed[b]!))
    .slice(-maxItems)

  const pruned: Store = {}
  for (const key of keep) pruned[key] = trimmed[key]!
  return pruned
}

function writeStore(store: Store): boolean {
  const pruned = pruneStore(store)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned))
    return true
  } catch {
    // Storage full — drop oldest half and retry once.
    const keys = Object.keys(pruned)
    if (keys.length <= 10) return false

    const smaller = pruneStore(pruned, Math.max(10, Math.floor(keys.length / 2)))
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(smaller))
      return true
    } catch {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
      return false
    }
  }
}

let pendingStore: Store | null = null
let flushTimer: number | null = null

function queueWrite(store: Store): void {
  pendingStore = store
  if (flushTimer !== null) return

  flushTimer = window.setTimeout(() => {
    flushTimer = null
    if (!pendingStore) return
    writeStore(pendingStore)
    pendingStore = null
  }, 250)
}

function appendSnapshot(store: Store, price: CommercePrice): Store {
  const buy = price.sells.unit_price
  const sell = price.buys.unit_price
  if (!buy && !sell) return store

  const key = String(price.id)
  const existing = store[key] ?? []
  const last = existing[existing.length - 1]
  const snapshot: PriceSnapshot = { t: Date.now(), buy, sell }

  if (last && last.buy === buy && last.sell === sell && Date.now() - last.t < 60_000) {
    return store
  }

  return { ...store, [key]: [...existing, snapshot].slice(-MAX_POINTS_PER_ITEM) }
}

export function recordPriceSnapshot(price: CommercePrice): void {
  const store = readStore()
  queueWrite(appendSnapshot(store, price))
}

export function recordPriceSnapshots(prices: CommercePrice[]): void {
  if (prices.length === 0) return

  let store = readStore()
  for (const price of prices) {
    store = appendSnapshot(store, price)
  }
  queueWrite(store)
}

export function getLocalPriceHistory(itemId: number): PriceSnapshot[] {
  return readStore()[String(itemId)] ?? []
}

export async function fetchPriceHistory(itemId: number): Promise<PriceSnapshot[]> {
  try {
    const response = await fetch(`/api/history/${itemId}`)
    if (!response.ok) throw new Error('server unavailable')
    const remote = (await response.json()) as PriceSnapshot[]
    if (Array.isArray(remote) && remote.length > 0) return remote
  } catch {
    // fall through to local cache
  }
  return getLocalPriceHistory(itemId)
}

// Prune on load so a prior full-scan does not keep blocking writes.
try {
  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing && existing.length > 500_000) {
    const store = pruneStore(JSON.parse(existing) as Store, 100)
    writeStore(store)
  }
} catch {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

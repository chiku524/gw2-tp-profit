import type { CommercePrice, PriceSnapshot } from '../types'

export type { PriceSnapshot }

const STORAGE_KEY = 'gw2-tp-price-history'
const MAX_ITEMS = 400
const MAX_POINTS_PER_ITEM = 120
const PUSH_COOLDOWN_MS = 30 * 60_000

type Store = Record<string, PriceSnapshot[]>

const lastPushAt = new Map<number, number>()
const pendingRegister = new Set<number>()
let registerTimer: number | null = null

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

function mergeSnapshots(a: PriceSnapshot[], b: PriceSnapshot[]): PriceSnapshot[] {
  const byTime = new Map<number, PriceSnapshot>()
  for (const row of [...a, ...b]) {
    if (!row?.t) continue
    byTime.set(row.t, row)
  }
  return [...byTime.values()].sort((left, right) => left.t - right.t)
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

  queueServerSync(price.id, snapshot)
  return { ...store, [key]: [...existing, snapshot].slice(-MAX_POINTS_PER_ITEM) }
}

function queueServerSync(itemId: number, snapshot: PriceSnapshot): void {
  const last = lastPushAt.get(itemId) ?? 0
  if (Date.now() - last < PUSH_COOLDOWN_MS) return
  lastPushAt.set(itemId, Date.now())

  void fetch(`/api/history/${itemId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  }).catch(() => {
    lastPushAt.delete(itemId)
  })
}

function queueRegister(itemIds: number[]): void {
  for (const id of itemIds) pendingRegister.add(id)
  if (registerTimer !== null) return

  registerTimer = window.setTimeout(() => {
    registerTimer = null
    const ids = [...pendingRegister]
    pendingRegister.clear()
    if (ids.length === 0) return

    void fetch('/api/history/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds: ids }),
    }).catch(() => {
      /* optional */
    })
  }, 500)
}

export function registerItemsForTracking(itemIds: number[]): void {
  if (itemIds.length === 0) return
  queueRegister(itemIds)
}

export function recordPriceSnapshot(price: CommercePrice): void {
  const store = readStore()
  queueWrite(appendSnapshot(store, price))
  registerItemsForTracking([price.id])
}

export function recordPriceSnapshots(prices: CommercePrice[]): void {
  if (prices.length === 0) return

  let store = readStore()
  for (const price of prices) {
    store = appendSnapshot(store, price)
  }
  queueWrite(store)
  registerItemsForTracking(prices.map((price) => price.id))
}

export function getLocalPriceHistory(itemId: number): PriceSnapshot[] {
  return readStore()[String(itemId)] ?? []
}

export async function fetchPriceHistory(itemId: number): Promise<PriceSnapshot[]> {
  const local = getLocalPriceHistory(itemId)

  try {
    const localParam = local.length > 0 ? encodeURIComponent(JSON.stringify(local.slice(-80))) : ''
    const url = localParam
      ? `/api/history/${itemId}?local=${localParam}`
      : `/api/history/${itemId}`
    const response = await fetch(url)
    if (!response.ok) throw new Error('server unavailable')
    const remote = (await response.json()) as PriceSnapshot[]
    if (Array.isArray(remote) && remote.length > 0) {
      return mergeSnapshots(local, remote).slice(-MAX_POINTS_PER_ITEM)
    }
  } catch {
    // fall through to local cache
  }

  return local
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

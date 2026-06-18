import type { CommercePrice } from '../types'

export type PriceSnapshot = {
  t: number
  buy: number
  sell: number
}

const STORAGE_KEY = 'gw2-tp-price-history'
const MAX_POINTS_PER_ITEM = 120

type Store = Record<string, PriceSnapshot[]>

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Store
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: Store): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function recordPriceSnapshot(price: CommercePrice): void {
  const buy = price.sells.unit_price
  const sell = price.buys.unit_price
  if (!buy && !sell) return

  const store = readStore()
  const key = String(price.id)
  const existing = store[key] ?? []
  const last = existing[existing.length - 1]
  const snapshot: PriceSnapshot = { t: Date.now(), buy, sell }

  if (last && last.buy === buy && last.sell === sell && Date.now() - last.t < 60_000) {
    return
  }

  const next = [...existing, snapshot].slice(-MAX_POINTS_PER_ITEM)
  store[key] = next
  writeStore(store)
}

export function recordPriceSnapshots(prices: CommercePrice[]): void {
  for (const price of prices) recordPriceSnapshot(price)
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

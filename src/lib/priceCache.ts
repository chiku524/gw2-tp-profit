import type { CommercePrice } from '../types'

const DB_NAME = 'gw2-tp-profit'
const DB_VERSION = 1
const STORE = 'commerce-prices'
const META_STORAGE_KEY = 'gw2-tp-profit.price-cache-meta'
export const PRICE_CACHE_TTL_MS = 10 * 60_000

type CachedEntry = CommercePrice & { cachedAt: number }

type CacheMeta = {
  cachedAt: number
  count: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('Failed to open price cache'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
  })
}

function readMeta(): CacheMeta | null {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CacheMeta
  } catch {
    return null
  }
}

function writeMeta(meta: CacheMeta): void {
  localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta))
}

function isFresh(entry: CachedEntry, now = Date.now()): boolean {
  return now - entry.cachedAt < PRICE_CACHE_TTL_MS
}

export type PriceCacheStats = {
  count: number
  cachedAt: number | null
  isFull: boolean
  ageMinutes: number | null
}

export async function getPriceCacheStats(expectedCount = 0): Promise<PriceCacheStats> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const countReq = store.count()
    const meta = readMeta()

    const count = await new Promise<number>((resolve, reject) => {
      countReq.onsuccess = () => resolve(countReq.result)
      countReq.onerror = () => reject(countReq.error)
    })

    db.close()

    const priceCount = count
    const cachedAt = meta?.cachedAt ?? null
    const isFull = expectedCount > 0 ? priceCount >= expectedCount * 0.98 : priceCount > 25_000
    const ageMinutes =
      cachedAt !== null ? Math.round((Date.now() - cachedAt) / 60_000) : null

    return { count: priceCount, cachedAt, isFull, ageMinutes }
  } catch {
    return { count: 0, cachedAt: null, isFull: false, ageMinutes: null }
  }
}

export async function getCachedPrices(ids: number[]): Promise<{
  hits: CommercePrice[]
  misses: number[]
}> {
  if (ids.length === 0) return { hits: [], misses: [] }

  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const now = Date.now()

    const results = await Promise.all(
      ids.map(
        (id) =>
          new Promise<CachedEntry | undefined>((resolve, reject) => {
            const req = store.get(id)
            req.onsuccess = () => resolve(req.result as CachedEntry | undefined)
            req.onerror = () => reject(req.error)
          }),
      ),
    )

    db.close()

    const hits: CommercePrice[] = []
    const misses: number[] = []

    for (let index = 0; index < ids.length; index++) {
      const entry = results[index]
      if (entry && isFresh(entry, now)) {
        hits.push({
          id: entry.id,
          whitelisted: entry.whitelisted,
          buys: entry.buys,
          sells: entry.sells,
        })
      } else {
        misses.push(ids[index]!)
      }
    }

    return { hits, misses }
  } catch {
    return { hits: [], misses: ids }
  }
}

export async function loadAllFreshPrices(): Promise<CommercePrice[] | null> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)

    const all = await new Promise<CachedEntry[]>((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result as CachedEntry[])
      req.onerror = () => reject(req.error)
    })

    db.close()

    const meta = readMeta()
    if (!meta || Date.now() - meta.cachedAt >= PRICE_CACHE_TTL_MS) return null
    if (all.length < 25_000) return null

    const fresh = all.filter((row) => isFresh(row, Date.now()))
    if (fresh.length < all.length * 0.95) return null

    return fresh.map(({ id, whitelisted, buys, sells }) => ({ id, whitelisted, buys, sells }))
  } catch {
    return null
  }
}

export async function putCachedPrices(prices: CommercePrice[], markFullScan = false): Promise<void> {
  if (prices.length === 0) return

  try {
    const db = await openDb()
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const cachedAt = Date.now()

    for (const price of prices) {
      store.put({ ...price, cachedAt })
    }

    if (markFullScan) {
      writeMeta({ cachedAt, count: prices.length })
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })

    db.close()
  } catch {
    /* cache is optional */
  }
}

export async function clearPriceCache(): Promise<void> {
  try {
    localStorage.removeItem(META_STORAGE_KEY)
    const db = await openDb()
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    /* ignore */
  }
}

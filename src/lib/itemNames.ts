import { fetchItems } from './gw2Api'
import type { FlipOpportunity, Gw2Item } from '../types'

const BATCH = 200
const itemCache = new Map<number, Gw2Item>()

export function cacheItems(items: Gw2Item[]): void {
  for (const item of items) itemCache.set(item.id, item)
}

export function getCachedItem(itemId: number): Gw2Item | undefined {
  return itemCache.get(itemId)
}

export function isPlaceholderName(name: string, itemId: number): boolean {
  return name === `Item ${itemId}` || /^Item \d+$/.test(name)
}

export async function fetchItemsBatched(ids: number[]): Promise<Gw2Item[]> {
  const unique = [...new Set(ids)]
  const missing = unique.filter((id) => !itemCache.has(id))
  const results: Gw2Item[] = []

  for (const id of unique) {
    const cached = itemCache.get(id)
    if (cached) results.push(cached)
  }

  for (let index = 0; index < missing.length; index += BATCH) {
    const batch = missing.slice(index, index + BATCH)
    const items = await fetchItems(batch)
    cacheItems(items)
    results.push(...items)
  }

  return results
}

export async function enrichFlipOpportunities(rows: FlipOpportunity[]): Promise<FlipOpportunity[]> {
  if (rows.length === 0) return rows

  const ids = rows.map((row) => row.itemId)
  await fetchItemsBatched(ids)

  return rows.map((row) => {
    const item = itemCache.get(row.itemId)
    if (!item) return row
    return {
      ...row,
      itemName: item.name,
      icon: item.icon ?? row.icon,
    }
  })
}

export async function resolveItemName(itemId: number): Promise<Gw2Item | null> {
  const cached = itemCache.get(itemId)
  if (cached) return cached
  const items = await fetchItemsBatched([itemId])
  return items[0] ?? null
}

import type { CommercePrice, Gw2Item } from '../types'

const API_BASE = 'https://api.guildwars2.com/v2'
const BATCH_SIZE = 200

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`GW2 API ${response.status}: ${url}`)
  }
  return response.json() as Promise<T>
}

export async function fetchCommercePriceIds(): Promise<number[]> {
  return fetchJson<number[]>(`${API_BASE}/commerce/prices`)
}

export async function fetchCommercePrices(ids: number[]): Promise<CommercePrice[]> {
  if (ids.length === 0) return []
  const result = await fetchJson<CommercePrice[]>(
    `${API_BASE}/commerce/prices?ids=${ids.join(',')}`,
  )
  return Array.isArray(result) ? result : [result]
}

export async function fetchItems(ids: number[]): Promise<Gw2Item[]> {
  if (ids.length === 0) return []
  const result = await fetchJson<Gw2Item[]>(`${API_BASE}/items?ids=${ids.join(',')}`)
  return Array.isArray(result) ? result : [result]
}

export async function searchItems(query: string): Promise<Gw2Item[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []
  return fetchJson<Gw2Item[]>(`${API_BASE}/items/search?name=${encodeURIComponent(trimmed)}`)
}

export async function fetchCommercePrice(itemId: number): Promise<CommercePrice> {
  return fetchJson<CommercePrice>(`${API_BASE}/commerce/prices/${itemId}`)
}

export async function* batchCommercePrices(
  ids: number[],
  onProgress?: (loaded: number, total: number) => void,
): AsyncGenerator<CommercePrice[]> {
  for (let index = 0; index < ids.length; index += BATCH_SIZE) {
    const batch = ids.slice(index, index + BATCH_SIZE)
    const prices = await fetchCommercePrices(batch)
    onProgress?.(Math.min(index + batch.length, ids.length), ids.length)
    yield prices
    await new Promise((resolve) => setTimeout(resolve, 120))
  }
}

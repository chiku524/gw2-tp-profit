import { gw2Fetch, gw2FetchAllPages } from './gw2Fetch'
import { recordPriceSnapshot, recordPriceSnapshots } from './priceHistory'
import type {
  CommerceDelivery,
  CommerceListings,
  CommercePrice,
  CommerceTransaction,
  GemExchange,
  Gw2Account,
  Gw2Item,
  Gw2Recipe,
  TokenInfo,
} from '../types'

const BATCH_SIZE = 200

export async function fetchCommercePriceIds(): Promise<number[]> {
  return gw2Fetch<number[]>('/commerce/prices')
}

export async function fetchCommercePrices(ids: number[]): Promise<CommercePrice[]> {
  if (ids.length === 0) return []
  const result = await gw2Fetch<CommercePrice[]>(`/commerce/prices?ids=${ids.join(',')}`)
  const prices = Array.isArray(result) ? result : [result]
  recordPriceSnapshots(prices)
  return prices
}

export async function fetchItems(ids: number[]): Promise<Gw2Item[]> {
  if (ids.length === 0) return []
  const result = await gw2Fetch<Gw2Item[]>(`/items?ids=${ids.join(',')}`)
  return Array.isArray(result) ? result : [result]
}

export async function searchItems(query: string): Promise<Gw2Item[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []
  return gw2Fetch<Gw2Item[]>(`/items/search?name=${encodeURIComponent(trimmed)}`)
}

export async function fetchCommerceListings(itemId: number): Promise<CommerceListings> {
  return gw2Fetch<CommerceListings>(`/commerce/listings/${itemId}`)
}

export async function fetchGemExchange(): Promise<GemExchange[]> {
  const result = await gw2Fetch<GemExchange[] | GemExchange>('/commerce/exchange')
  return Array.isArray(result) ? result : [result]
}

export async function fetchItem(itemId: number): Promise<Gw2Item> {
  return gw2Fetch<Gw2Item>(`/items/${itemId}`)
}

export async function fetchCommercePrice(itemId: number): Promise<CommercePrice> {
  const price = await gw2Fetch<CommercePrice>(`/commerce/prices/${itemId}`)
  recordPriceSnapshot(price)
  return price
}

export async function searchRecipesByOutput(itemId: number): Promise<number[]> {
  return gw2Fetch<number[]>(`/recipes/search?output=${itemId}`)
}

export async function fetchRecipes(ids: number[]): Promise<Gw2Recipe[]> {
  if (ids.length === 0) return []
  const result = await gw2Fetch<Gw2Recipe[]>(`/recipes?ids=${ids.join(',')}`)
  return Array.isArray(result) ? result : [result]
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

export async function fetchTokenInfo(accessToken: string): Promise<TokenInfo> {
  return gw2Fetch<TokenInfo>('/tokeninfo', { accessToken })
}

export async function fetchAccount(accessToken: string): Promise<Gw2Account> {
  return gw2Fetch<Gw2Account>('/account', { accessToken })
}

export async function fetchDelivery(accessToken: string): Promise<CommerceDelivery> {
  return gw2Fetch<CommerceDelivery>('/commerce/delivery', { accessToken })
}

export async function fetchCurrentOrders(
  accessToken: string,
  side: 'buys' | 'sells',
  signal?: AbortSignal,
): Promise<CommerceTransaction[]> {
  return gw2FetchAllPages<CommerceTransaction>(
    `/commerce/transactions/current/${side}`,
    accessToken,
    signal,
  )
}

export async function fetchHistoryOrders(
  accessToken: string,
  side: 'buys' | 'sells',
  signal?: AbortSignal,
): Promise<CommerceTransaction[]> {
  return gw2FetchAllPages<CommerceTransaction>(
    `/commerce/transactions/history/${side}`,
    accessToken,
    signal,
  )
}

export async function fetchBankItemCounts(accessToken: string): Promise<Record<number, number>> {
  const bank = await gw2Fetch<{ id: number; count: number }[]>('/account/bank', { accessToken })
  const materials = await gw2Fetch<{ id: number; count: number }[]>('/account/materials', {
    accessToken,
  })

  const counts: Record<number, number> = {}
  for (const slot of [...bank, ...materials]) {
    if (!slot?.id || !slot.count) continue
    counts[slot.id] = (counts[slot.id] ?? 0) + slot.count
  }
  return counts
}

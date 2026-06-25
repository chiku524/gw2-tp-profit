import { gw2Fetch, gw2FetchAllPages } from './gw2Fetch'
import type {
  CommerceDelivery,
  CommerceListings,
  CommercePrice,
  CommerceTransaction,
  GemExchange,
  Gw2Account,
  Gw2Item,
  Gw2Recipe,
  Gw2Character,
  TokenInfo,
} from '../types'

const BATCH_SIZE = 200

export async function fetchCommercePriceIds(): Promise<number[]> {
  return gw2Fetch<number[]>('/commerce/prices')
}

export async function fetchCommercePrices(ids: number[]): Promise<CommercePrice[]> {
  if (ids.length === 0) return []
  const result = await gw2Fetch<CommercePrice[]>(`/commerce/prices?ids=${ids.join(',')}`)
  return Array.isArray(result) ? result : [result]
}

export async function fetchItems(ids: number[]): Promise<Gw2Item[]> {
  if (ids.length === 0) return []
  try {
    const result = await gw2Fetch<Gw2Item[]>(`/items?ids=${ids.join(',')}`)
    return Array.isArray(result) ? result : [result]
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('404') || ids.length === 1) {
      throw error
    }
    const results: Gw2Item[] = []
    for (const id of ids) {
      try {
        results.push(...(await fetchItems([id])))
      } catch {
        /* skip removed or invalid item ids */
      }
    }
    return results
  }
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
  return gw2Fetch<CommercePrice>(`/commerce/prices/${itemId}`)
}

export async function searchRecipesByOutput(itemId: number): Promise<number[]> {
  return gw2Fetch<number[]>(`/recipes/search?output=${itemId}`)
}

export async function fetchRecipes(ids: number[]): Promise<Gw2Recipe[]> {
  if (ids.length === 0) return []
  const result = await gw2Fetch<Gw2Recipe[]>(`/recipes?ids=${ids.join(',')}`)
  return Array.isArray(result) ? result : [result]
}

export async function fetchRecipeIds(): Promise<number[]> {
  return gw2Fetch<number[]>('/recipes')
}

export async function fetchRecipesBatched(
  ids: number[],
  onProgress?: (loaded: number, total: number) => void,
): Promise<Gw2Recipe[]> {
  const results: Gw2Recipe[] = []
  for (let index = 0; index < ids.length; index += BATCH_SIZE) {
    const batch = ids.slice(index, index + BATCH_SIZE)
    results.push(...(await fetchRecipes(batch)))
    onProgress?.(Math.min(index + batch.length, ids.length), ids.length)
    await new Promise((resolve) => window.setTimeout(resolve, 40))
  }
  return results
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

export async function fetchCharacterNames(accessToken: string): Promise<string[]> {
  // Do not paginate here — GW2 expands paged /characters responses into objects, not names.
  const result = await gw2Fetch<string[]>('/characters', { accessToken })
  if (!Array.isArray(result)) return []
  return result.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
}

/** Full character payloads (crafting levels, bags, etc.) in one authenticated request. */
export async function fetchAllAccountCharacters(accessToken: string): Promise<Gw2Character[]> {
  const result = await gw2Fetch<Gw2Character[]>('/characters?ids=all', { accessToken })
  return Array.isArray(result) ? result : [result]
}

export async function fetchAccountRecipes(accessToken: string): Promise<number[]> {
  return gw2Fetch<number[]>('/account/recipes', { accessToken })
}

export async function fetchCharacters(accessToken: string, names: string[]): Promise<Gw2Character[]> {
  if (names.length === 0) return []

  const validNames = names
    .map((name) => {
      if (typeof name === 'string') return name
      if (name && typeof name === 'object' && 'name' in name) {
        return String((name as Gw2Character).name)
      }
      return ''
    })
    .filter((name) => name.length > 0)

  if (validNames.length === 0) return []

  const results: Gw2Character[] = []
  const batchSize = 8

  for (let index = 0; index < validNames.length; index += batchSize) {
    const batch = validNames.slice(index, index + batchSize)
    const ids = batch.map((name) => encodeURIComponent(name)).join(',')
    const response = await gw2Fetch<Gw2Character[] | Gw2Character>(`/characters?ids=${ids}`, {
      accessToken,
    })
    const characters = Array.isArray(response) ? response : [response]
    results.push(...characters)
  }

  return results
}

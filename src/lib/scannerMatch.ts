import { categoryForItemType } from './itemCategories'
import { disciplinesForItem, getDisciplineIndex } from './disciplineIndex'
import { itemFilterTags } from './itemSubtypes'
import { matchesScanFilters, scanFiltersNeedItemMetadata } from './scanFilters'
import { fetchItemsBatched, getCachedItem } from './itemNames'
import { opportunityFromPrice } from './profit'
import type { CommercePrice, FlipOpportunity, ScanFilters } from '../types'

function attachItemMetadata(
  row: FlipOpportunity,
  disciplineIndex: Map<number, string[]> | null,
): FlipOpportunity {
  const item = getCachedItem(row.itemId)
  if (!item) return row

  const itemDisciplines = disciplinesForItem(row.itemId, disciplineIndex)
  const itemType = item.type ?? row.itemType

  return {
    ...row,
    itemName: item.name,
    icon: item.icon ?? row.icon,
    itemType,
    itemCategory: categoryForItemType(itemType),
    itemDisciplines,
    itemTags: itemFilterTags(item, itemDisciplines),
  }
}

export async function matchesFromPrices(
  prices: CommercePrice[],
  filters: ScanFilters,
  options?: {
    onProgress?: (message: string, loaded: number, total: number) => void
    signal?: { aborted?: boolean }
  },
): Promise<FlipOpportunity[]> {
  const candidates: FlipOpportunity[] = []

  for (const price of prices) {
    if (filters.f2pOnly && !price.whitelisted) continue
    const opportunity = opportunityFromPrice(price)
    if (!opportunity) continue
    if (opportunity.listingProfit < filters.minProfit) continue
    if (opportunity.listingRoi < filters.minRoi) continue
    if (Math.min(opportunity.buyVolume, opportunity.sellVolume) < filters.minVolume) continue
    candidates.push(opportunity)
  }

  if (candidates.length === 0) return []

  const needsMetadata = scanFiltersNeedItemMetadata(filters)
  let disciplineIndex: Map<number, string[]> | null = null

  if (needsMetadata || filters.disciplines.length > 0) {
    if (filters.disciplines.length > 0) {
      disciplineIndex = await getDisciplineIndex({
        onProgress: options?.onProgress,
        signal: options?.signal,
      })
      if (options?.signal?.aborted) return []
    }
    await fetchItemsBatched(candidates.map((row) => row.itemId))
  }

  return candidates
    .map((row) => attachItemMetadata(row, disciplineIndex))
    .filter((row) => matchesScanFilters(row, filters))
}

import { categoryForItemType, matchesItemCategories } from './itemCategories'
import { fetchItemsBatched, getCachedItem } from './itemNames'
import { opportunityFromPrice } from './profit'
import type { CommercePrice, FlipOpportunity, ScanFilters } from '../types'

function attachItemMetadata(row: FlipOpportunity): FlipOpportunity {
  const item = getCachedItem(row.itemId)
  if (!item) return row
  return {
    ...row,
    itemName: item.name,
    icon: item.icon ?? row.icon,
    itemType: item.type,
    itemCategory: categoryForItemType(item.type),
  }
}

export async function matchesFromPrices(
  prices: CommercePrice[],
  filters: ScanFilters,
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

  if (filters.categories.length > 0) {
    await fetchItemsBatched(candidates.map((row) => row.itemId))
  }

  return candidates
    .map(attachItemMetadata)
    .filter((row) => matchesItemCategories(row.itemType, filters.categories))
}

import type { CommercePrice, Gw2Recipe } from '../types'

export type CraftVolumeBreakdown = {
  /** How many times you can craft from ingredient listing depth. */
  maxCraftVolume: number
  /** How many crafts the output market can absorb (buy demand or listing depth). */
  outputVolume: number
  /** Realistic throughput: min(ingredient supply, output demand). */
  bottleneckVolume: number
}

export function craftVolumeBreakdown(
  recipe: Gw2Recipe,
  priceMap: Map<number, CommercePrice>,
): CraftVolumeBreakdown {
  let maxCraftVolume = Number.POSITIVE_INFINITY

  for (const ingredient of recipe.ingredients) {
    const price = priceMap.get(ingredient.item_id)
    const listed = price?.sells.quantity ?? 0
    const batches = ingredient.count > 0 ? Math.floor(listed / ingredient.count) : 0
    maxCraftVolume = Math.min(maxCraftVolume, batches)
  }

  if (!Number.isFinite(maxCraftVolume)) maxCraftVolume = 0

  const output = priceMap.get(recipe.output_item_id)
  const outputCount = Math.max(1, recipe.output_item_count)
  const buyDemand = output?.buys.quantity ?? 0
  const sellListed = output?.sells.quantity ?? 0
  const outputVolume =
    buyDemand > 0 ? Math.floor(buyDemand / outputCount) : Math.floor(sellListed / outputCount)

  const bottleneckVolume = Math.min(maxCraftVolume, outputVolume)

  return {
    maxCraftVolume,
    outputVolume,
    bottleneckVolume,
  }
}

/** Profit scaled by log market depth — favors liquid combines. */
export function volumeWeightedProfit(listingProfit: number, bottleneckVolume: number): number {
  if (listingProfit <= 0 || bottleneckVolume <= 0) return 0
  return listingProfit * Math.log10(bottleneckVolume + 1)
}

/** Total profit if you craft and sell through the bottleneck volume. */
export function stackCraftProfit(listingProfit: number, bottleneckVolume: number): number {
  if (listingProfit <= 0 || bottleneckVolume <= 0) return 0
  return listingProfit * bottleneckVolume
}

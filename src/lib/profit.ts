import type { CommercePrice, FlipOpportunity } from '../types'

export const LISTING_FEE_RATE = 0.05
export const EXCHANGE_FEE_RATE = 0.1

export function instantFlipProfit(buyPrice: number, sellPrice: number): number {
  return sellPrice - buyPrice
}

export function listingNetRevenue(listPrice: number): number {
  return listPrice * (1 - EXCHANGE_FEE_RATE) - listPrice * LISTING_FEE_RATE
}

export function listingFlipProfit(buyPrice: number, listPrice: number): number {
  return listingNetRevenue(listPrice) - buyPrice
}

export function roi(profit: number, cost: number): number {
  if (cost <= 0) return 0
  return (profit / cost) * 100
}

export function opportunityFromPrice(
  price: CommercePrice,
  itemName = `Item ${price.id}`,
  icon?: string,
): FlipOpportunity | null {
  const buyPrice = price.sells.unit_price
  const sellPrice = price.buys.unit_price

  if (buyPrice <= 0 || sellPrice <= 0) return null

  const instantProfit = instantFlipProfit(buyPrice, sellPrice)
  const listingProfit = listingFlipProfit(buyPrice, sellPrice)

  if (instantProfit <= 0 && listingProfit <= 0) return null

  return {
    itemId: price.id,
    itemName,
    icon,
    buyPrice,
    sellPrice,
    instantProfit,
    instantRoi: roi(instantProfit, buyPrice),
    buyVolume: price.sells.quantity,
    sellVolume: price.buys.quantity,
    listingProfit,
    listingRoi: roi(listingProfit, buyPrice),
    whitelisted: price.whitelisted,
  }
}

import { listingFlipProfit } from './profit'

/** Suggest a sell list price one copper below lowest competitor. */
export function suggestUndercutSell(lowestSell: number): number {
  if (lowestSell <= 0) return 0
  return Math.max(1, lowestSell - 1)
}

/** Match highest buy order for instant sell. */
export function suggestInstantSell(highestBuy: number): number {
  return highestBuy
}

/** Bid one copper above highest buy to become top buy order. */
export function suggestOutbidBuy(highestBuy: number): number {
  return highestBuy + 1
}

export function spreadPercent(buyPrice: number, sellPrice: number): number {
  if (buyPrice <= 0) return 0
  return ((sellPrice - buyPrice) / buyPrice) * 100
}

export function stackInstantProfit(unitProfit: number, quantity: number): number {
  return unitProfit * quantity
}

export function stackListingProfit(buyPrice: number, listPrice: number, quantity: number): number {
  return listingFlipProfit(buyPrice, listPrice) * quantity
}

export function maxFlipQuantity(buyVolume: number, sellVolume: number): number {
  return Math.min(buyVolume, sellVolume)
}

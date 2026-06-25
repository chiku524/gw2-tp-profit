import { spreadListingFlipProfit, type FlipSellStrategy } from './profit'

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

export function spreadPercent(lowestSell: number, highestBuy: number): number {
  if (highestBuy <= 0) return 0
  return ((lowestSell - highestBuy) / highestBuy) * 100
}

export function stackInstantProfit(unitProfit: number, quantity: number): number {
  return unitProfit * quantity
}

export function stackListingProfit(
  lowestSell: number,
  highestBuy: number,
  quantity: number,
  sellStrategy?: FlipSellStrategy,
): number {
  return spreadListingFlipProfit(lowestSell, highestBuy, sellStrategy) * quantity
}

export function maxFlipQuantity(buyVolume: number, sellVolume: number): number {
  return Math.min(buyVolume, sellVolume)
}

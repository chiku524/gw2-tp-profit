import { suggestInstantSell, suggestOutbidBuy, suggestUndercutSell } from './marketMath'
import { enrichFlipLiquidity } from './liquidity'
import { enrichFlipRisk } from './riskFlags'
import type { CommercePrice, FlipOpportunity } from '../types'

export const LISTING_FEE_RATE = 0.05
export const EXCHANGE_FEE_RATE = 0.1

/** How to estimate exit price for a listing-style flip. */
export type FlipSellStrategy = 'undercut-listing' | 'sell-to-buy-order'

const WIDE_SPREAD_SELL_TO_BUY_ORDER_PCT = 80

export function flipSellStrategyForItemType(itemType?: string): FlipSellStrategy {
  return itemType === 'Armor' ? 'sell-to-buy-order' : 'undercut-listing'
}

export function resolveFlipSellStrategy(
  lowestSell: number,
  highestBuy: number,
  itemType?: string,
): FlipSellStrategy {
  if (itemType === 'Armor') return 'sell-to-buy-order'
  if (spreadGapPercent(lowestSell, highestBuy) > WIDE_SPREAD_SELL_TO_BUY_ORDER_PCT) {
    return 'sell-to-buy-order'
  }
  return 'undercut-listing'
}

/** Buy from listings now, sell to highest buy order now (almost always a loss on GW2). */
export function instantFlipProfit(lowestSell: number, highestBuy: number): number {
  return highestBuy - lowestSell
}

export function listingNetRevenue(listPrice: number): number {
  return listPrice * (1 - EXCHANGE_FEE_RATE) - listPrice * LISTING_FEE_RATE
}

/** Profit when you buy at `buyCost` and list at `listPrice` (includes TP fees). */
export function listingFlipProfit(buyCost: number, listPrice: number): number {
  return listingNetRevenue(listPrice) - buyCost
}

/**
 * Standard TP flip: outbid highest buy (+1c), then exit after fill.
 * Most items undercut lowest sell (−1c); armor uses highest buy (sell to buy order, no fees).
 */
export function spreadListingFlipProfit(
  lowestSell: number,
  highestBuy: number,
  sellStrategy: FlipSellStrategy = 'undercut-listing',
): number {
  if (lowestSell <= 0 || highestBuy <= 0) return 0
  const buyCost = suggestOutbidBuy(highestBuy)

  if (sellStrategy === 'sell-to-buy-order') {
    return suggestInstantSell(highestBuy) - buyCost
  }

  const listPrice = suggestUndercutSell(lowestSell)
  return listingFlipProfit(buyCost, listPrice)
}

export function spreadGapPercent(lowestSell: number, highestBuy: number): number {
  if (highestBuy <= 0) return 0
  return ((lowestSell - highestBuy) / highestBuy) * 100
}

export function roi(profit: number, cost: number): number {
  if (cost <= 0) return 0
  return (profit / cost) * 100
}

export function opportunityFromPrice(
  price: CommercePrice,
  itemName = `Item ${price.id}`,
  icon?: string,
  itemType?: string,
): FlipOpportunity | null {
  const lowestSell = price.sells.unit_price
  const highestBuy = price.buys.unit_price

  if (lowestSell <= 0 || highestBuy <= 0) return null

  const sellStrategy = resolveFlipSellStrategy(lowestSell, highestBuy, itemType)
  const instantProfit = instantFlipProfit(lowestSell, highestBuy)
  const listingProfit = spreadListingFlipProfit(lowestSell, highestBuy, sellStrategy)
  const flipBuyCost = suggestOutbidBuy(highestBuy)

  if (listingProfit <= 0 && instantProfit <= 0) return null

  return enrichFlipRisk(
    enrichFlipLiquidity({
      itemId: price.id,
      itemName,
      icon,
      buyPrice: lowestSell,
      sellPrice: highestBuy,
      instantProfit,
      instantRoi: roi(instantProfit, lowestSell),
      buyVolume: price.sells.quantity,
      sellVolume: price.buys.quantity,
      listingProfit,
      listingRoi: roi(listingProfit, flipBuyCost),
      whitelisted: price.whitelisted,
      spreadPct: spreadGapPercent(lowestSell, highestBuy),
    }),
  )
}

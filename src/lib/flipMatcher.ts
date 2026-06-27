import { listingNetRevenue } from './profit'
import type { CommerceTransaction } from '../types'

export type MatchedFlip = {
  itemId: number
  itemName: string
  quantity: number
  buyPrice: number
  sellPrice: number
  profit: number
  boughtAt: string
  soldAt: string
}

export type FlipMatcherSummary = {
  matchedFlips: number
  matchedQuantity: number
  totalProfit: number
  unmatchedBuys: number
  unmatchedSells: number
}

type Lot = {
  price: number
  quantity: number
  at: string
}

function sortByTime(rows: CommerceTransaction[]): CommerceTransaction[] {
  return [...rows].sort(
    (a, b) => Date.parse(a.purchased ?? a.created) - Date.parse(b.purchased ?? b.created),
  )
}

export function matchFlips(
  buys: CommerceTransaction[],
  sells: CommerceTransaction[],
  itemNames: Map<number, string>,
): { flips: MatchedFlip[]; summary: FlipMatcherSummary } {
  const flips: MatchedFlip[] = []
  let unmatchedBuys = 0
  let unmatchedSells = 0

  const buysByItem = new Map<number, Lot[]>()
  for (const row of sortByTime(buys)) {
    const lots = buysByItem.get(row.item_id) ?? []
    lots.push({
      price: row.price,
      quantity: row.quantity,
      at: row.purchased ?? row.created,
    })
    buysByItem.set(row.item_id, lots)
  }

  for (const sell of sortByTime(sells)) {
    const lots = buysByItem.get(sell.item_id)
    if (!lots || lots.length === 0) {
      unmatchedSells += sell.quantity
      continue
    }

    let remaining = sell.quantity
    const sellAt = sell.purchased ?? sell.created

    while (remaining > 0 && lots.length > 0) {
      const lot = lots[0]
      const matched = Math.min(remaining, lot.quantity)
      const netSell = listingNetRevenue(sell.price)
      const profit = Math.round((netSell - lot.price) * matched)

      flips.push({
        itemId: sell.item_id,
        itemName: itemNames.get(sell.item_id) ?? `Item ${sell.item_id}`,
        quantity: matched,
        buyPrice: lot.price,
        sellPrice: sell.price,
        profit,
        boughtAt: lot.at,
        soldAt: sellAt,
      })

      lot.quantity -= matched
      remaining -= matched
      if (lot.quantity <= 0) lots.shift()
    }

    if (remaining > 0) unmatchedSells += remaining
  }

  for (const lots of buysByItem.values()) {
    for (const lot of lots) unmatchedBuys += lot.quantity
  }

  const summary: FlipMatcherSummary = {
    matchedFlips: flips.length,
    matchedQuantity: flips.reduce((sum, row) => sum + row.quantity, 0),
    totalProfit: flips.reduce((sum, row) => sum + row.profit, 0),
    unmatchedBuys,
    unmatchedSells,
  }

  flips.sort((a, b) => Date.parse(b.soldAt) - Date.parse(a.soldAt))
  return { flips, summary }
}

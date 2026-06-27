import { fetchCommercePrices, fetchCurrentOrders, fetchItems } from './gw2Api'
import type { CommerceTransaction, OrderRow } from '../types'

function orderStatus(
  side: 'buy' | 'sell',
  yourPrice: number,
  marketPrice: number,
): OrderRow['status'] {
  if (marketPrice <= 0) return 'unknown'
  if (side === 'sell') {
    if (yourPrice <= marketPrice) return 'competitive'
    return 'undercut'
  }
  if (yourPrice >= marketPrice) return 'competitive'
  return 'outbid'
}

export async function enrichOrders(
  orders: CommerceTransaction[],
  side: 'buy' | 'sell',
): Promise<OrderRow[]> {
  if (orders.length === 0) return []

  const itemIds = [...new Set(orders.map((order) => order.item_id))]
  const [items, prices] = await Promise.all([
    fetchItems(itemIds),
    fetchCommercePrices(itemIds),
  ])

  const itemMap = new Map(items.map((item) => [item.id, item]))
  const priceMap = new Map(prices.map((price) => [price.id, price]))

  return orders.map((order) => {
    const item = itemMap.get(order.item_id)
    const market = priceMap.get(order.item_id)
    const marketPrice =
      side === 'sell' ? (market?.sells.unit_price ?? 0) : (market?.buys.unit_price ?? 0)
    const status = orderStatus(side, order.price, marketPrice)
    const gap = side === 'sell' ? order.price - marketPrice : marketPrice - order.price

    return {
      id: order.id,
      itemId: order.item_id,
      itemName: item?.name ?? `Item ${order.item_id}`,
      icon: item?.icon,
      side,
      yourPrice: order.price,
      marketPrice,
      quantity: order.quantity,
      created: order.created,
      status,
      gap: Math.max(0, gap),
    }
  })
}

export async function fetchEnrichedOrders(accessToken: string): Promise<OrderRow[]> {
  const [buys, sells] = await Promise.all([
    fetchCurrentOrders(accessToken, 'buys'),
    fetchCurrentOrders(accessToken, 'sells'),
  ])

  const enriched = [
    ...(await enrichOrders(buys, 'buy')),
    ...(await enrichOrders(sells, 'sell')),
  ]

  return enriched
}

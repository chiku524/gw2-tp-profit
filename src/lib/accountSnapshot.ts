import {
  fetchCharacterNames,
  fetchCharacters,
  fetchCommercePrices,
  fetchCurrentOrders,
} from './gw2Api'
import { gw2Fetch } from './gw2Fetch'
import { EXCHANGE_FEE_RATE, listingNetRevenue } from './profit'
import { suggestUndercutSell } from './marketMath'
import type { CommerceTransaction, Gw2Character, StorageSellOpportunity } from '../types'

export const ORDER_SLOT_LIMIT = 250

type WalletCurrency = { id: number; value: number }
type InventorySlot = { id: number; count: number }

export type CapitalSnapshot = {
  walletGold: number
  deliveryGold: number
  deliveryItemsValue: number
  lockedInBuyOrders: number
  sellListingsGross: number
  sellListingsNet: number
  freeCapital: number
  totalDeployed: number
  totalLiquid: number
  orderSlotCount: number
  orderSlotLimit: number
  freeSlots: number
}

export type AccountRawData = {
  wallet: WalletCurrency[]
  delivery: { coins: number; items: InventorySlot[] }
  buys: CommerceTransaction[]
  sells: CommerceTransaction[]
  bank: InventorySlot[]
  materials: InventorySlot[]
  characters: Gw2Character[]
}

export async function fetchAccountRawData(
  accessToken: string,
  permissions: Set<string>,
): Promise<AccountRawData> {
  const hasWallet = permissions.has('wallet')
  const hasTp = permissions.has('tradingpost')
  const hasInventories = permissions.has('inventories')
  const hasCharacters = permissions.has('characters')

  const [wallet, delivery, buys, sells, bank, materials, characterNames] = await Promise.all([
    hasWallet ? gw2Fetch<WalletCurrency[]>('/account/wallet', { accessToken }) : Promise.resolve([]),
    hasTp
      ? gw2Fetch<{ coins: number; items: InventorySlot[] }>('/commerce/delivery', { accessToken })
      : Promise.resolve({ coins: 0, items: [] }),
    hasTp ? fetchCurrentOrders(accessToken, 'buys') : Promise.resolve([]),
    hasTp ? fetchCurrentOrders(accessToken, 'sells') : Promise.resolve([]),
    hasInventories ? gw2Fetch<InventorySlot[]>('/account/bank', { accessToken }) : Promise.resolve([]),
    hasInventories
      ? gw2Fetch<InventorySlot[]>('/account/materials', { accessToken })
      : Promise.resolve([]),
    hasCharacters && hasInventories
      ? fetchCharacterNames(accessToken).catch(() => [] as string[])
      : Promise.resolve([] as string[]),
  ])

  const characters =
    characterNames.length > 0
      ? await fetchCharacters(accessToken, characterNames).catch(() => [] as Gw2Character[])
      : []

  return { wallet, delivery, buys, sells, bank, materials, characters }
}

export function buildCapitalSnapshot(data: AccountRawData): CapitalSnapshot {
  const walletGold = data.wallet.find((row) => row.id === 1)?.value ?? 0
  const deliveryGold = data.delivery.coins ?? 0
  const lockedInBuyOrders = data.buys.reduce((sum, row) => sum + row.price * row.quantity, 0)
  const sellListingsGross = data.sells.reduce((sum, row) => sum + row.price * row.quantity, 0)
  const sellListingsNet = data.sells.reduce(
    (sum, row) => sum + row.price * row.quantity * (1 - EXCHANGE_FEE_RATE),
    0,
  )

  const totalLiquid = walletGold + deliveryGold + lockedInBuyOrders + sellListingsNet
  const freeCapital = walletGold + deliveryGold
  const totalDeployed = lockedInBuyOrders + sellListingsGross
  const orderSlotCount = data.buys.length + data.sells.length

  return {
    walletGold,
    deliveryGold,
    deliveryItemsValue: 0,
    lockedInBuyOrders,
    sellListingsGross,
    sellListingsNet,
    freeCapital,
    totalDeployed,
    totalLiquid,
    orderSlotCount,
    orderSlotLimit: ORDER_SLOT_LIMIT,
    freeSlots: Math.max(0, ORDER_SLOT_LIMIT - orderSlotCount),
  }
}

type OwnedStack = { itemId: number; quantity: number; sources: string[] }

function addStack(map: Map<number, OwnedStack>, itemId: number, count: number, source: string): void {
  if (!itemId || count <= 0) return
  const existing = map.get(itemId)
  if (existing) {
    existing.quantity += count
    if (!existing.sources.includes(source)) existing.sources.push(source)
    return
  }
  map.set(itemId, { itemId, quantity: count, sources: [source] })
}

export function aggregateOwnedItems(data: AccountRawData): Map<number, OwnedStack> {
  const map = new Map<number, OwnedStack>()

  for (const row of data.bank) addStack(map, row.id, row.count, 'Bank')
  for (const row of data.materials) addStack(map, row.id, row.count, 'Materials')
  for (const row of data.delivery.items) addStack(map, row.id, row.count, 'Delivery')

  for (const character of data.characters) {
    for (const bag of character.bags) {
      if (!bag) continue
      for (const slot of bag.inventory) {
        if (!slot?.id) continue
        addStack(map, slot.id, slot.count, character.name)
      }
    }
  }

  return map
}

export async function findSellOpportunities(
  data: AccountRawData,
  itemNames: Map<number, { name: string; icon?: string }>,
): Promise<StorageSellOpportunity[]> {
  const owned = aggregateOwnedItems(data)
  const ids = [...owned.keys()]
  if (ids.length === 0) return []

  const prices = await fetchCommercePrices(ids)
  const opportunities: StorageSellOpportunity[] = []

  for (const price of prices) {
    const stack = owned.get(price.id)
    if (!stack || stack.quantity <= 0) continue

    const highestBuy = price.buys.unit_price
    const lowestSell = price.sells.unit_price
    if (highestBuy <= 0 && lowestSell <= 0) continue

    const listPrice = lowestSell > 0 ? suggestUndercutSell(lowestSell) : 0
    const listRevenue = listPrice > 0 ? listingNetRevenue(listPrice) * stack.quantity : 0
    const instantRevenue = highestBuy * stack.quantity
    const meta = itemNames.get(price.id)

    const score = Math.max(listRevenue, instantRevenue) * Math.log10(stack.quantity + 1)

    opportunities.push({
      itemId: price.id,
      name: meta?.name ?? `Item ${price.id}`,
      icon: meta?.icon,
      quantity: stack.quantity,
      sources: stack.sources.join(', '),
      highestBuy,
      lowestSell,
      listRevenue,
      instantRevenue,
      score,
    })
  }

  return opportunities.sort((a, b) => b.score - a.score)
}

export type OrderSlotAdvice = {
  order: CommerceTransaction & { side: 'buy' | 'sell'; itemName: string; gap: number; status: string }
  reason: string
  priority: number
}

export function adviseOrderCancellations(
  buys: CommerceTransaction[],
  sells: CommerceTransaction[],
  marketPrices: Map<number, { buy: number; sell: number }>,
  itemNames: Map<number, string>,
): OrderSlotAdvice[] {
  const advice: OrderSlotAdvice[] = []

  for (const order of buys) {
    const market = marketPrices.get(order.item_id)
    const topBuy = market?.buy ?? 0
    const gap = topBuy > 0 ? Math.max(0, topBuy - order.price) : 0
    const stale = gap > 0
    advice.push({
      order: {
        ...order,
        side: 'buy',
        itemName: itemNames.get(order.item_id) ?? `Item ${order.item_id}`,
        gap,
        status: stale ? 'outbid' : 'competitive',
      },
      reason: stale ? `Outbid by ${gap}c — capital locked` : 'Competitive buy',
      priority: stale ? gap * order.quantity : 0,
    })
  }

  for (const order of sells) {
    const market = marketPrices.get(order.item_id)
    const lowestSell = market?.sell ?? 0
    const gap = lowestSell > 0 ? Math.max(0, order.price - lowestSell) : 0
    const stale = gap > 0
    advice.push({
      order: {
        ...order,
        side: 'sell',
        itemName: itemNames.get(order.item_id) ?? `Item ${order.item_id}`,
        gap,
        status: stale ? 'undercut' : 'competitive',
      },
      reason: stale ? `Undercut by ${gap}c` : 'Competitive sell',
      priority: stale ? gap * order.quantity : 0,
    })
  }

  return advice.sort((a, b) => b.priority - a.priority)
}

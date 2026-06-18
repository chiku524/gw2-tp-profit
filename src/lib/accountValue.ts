import accountValue, { allItemIds } from 'gw2e-account-value'
import {
  fetchBankItemCounts,
  fetchCommercePrices,
  fetchCurrentOrders,
  fetchDelivery,
} from './gw2Api'
import { gw2Fetch } from './gw2Fetch'
import { EXCHANGE_FEE_RATE } from './profit'

type WalletCurrency = { id: number; value: number }
type InventorySlot = { id: number; count: number }

export type LiquidityBreakdown = {
  walletGold: number
  deliveryGold: number
  lockedInBuyOrders: number
  sellListingsGross: number
  sellListingsNet: number
  deliveryItemsValue: number
  totalLiquid: number
}

export type AccountValueBreakdown = {
  liquidity: LiquidityBreakdown
  storageEstimate: number | null
  gw2eSummary: number | null
  gw2eParts: Record<string, number | null>
  partial: boolean
  note: string
}

async function fetchWallet(accessToken: string): Promise<WalletCurrency[]> {
  return gw2Fetch<WalletCurrency[]>('/account/wallet', { accessToken })
}

async function fetchBank(accessToken: string): Promise<InventorySlot[]> {
  return gw2Fetch<InventorySlot[]>('/account/bank', { accessToken })
}

async function fetchMaterials(accessToken: string): Promise<InventorySlot[]> {
  return gw2Fetch<InventorySlot[]>('/account/materials', { accessToken })
}

function buildItemValues(
  itemIds: number[],
  prices: Awaited<ReturnType<typeof fetchCommercePrices>>,
): Record<number, { value: number; sell: { price: number }; buy: { price: number } }> {
  const priceMap = new Map(prices.map((row) => [row.id, row]))
  const values: Record<number, { value: number; sell: { price: number }; buy: { price: number } }> = {}

  for (const id of itemIds) {
    const price = priceMap.get(id)
    const sell = price?.sells.unit_price ?? 0
    const buy = price?.buys.unit_price ?? 0
    const value = buy > 0 ? buy : sell
    if (value <= 0) continue
    values[id] = { value, sell: { price: sell }, buy: { price: buy } }
  }

  return values
}

export async function calculateAccountValue(
  accessToken: string,
  permissions: Set<string>,
): Promise<AccountValueBreakdown> {
  const hasWallet = permissions.has('wallet')
  const hasTp = permissions.has('tradingpost')
  const hasInventories = permissions.has('inventories')

  const [wallet, delivery, buys, sells, bank, materials] = await Promise.all([
    hasWallet ? fetchWallet(accessToken) : Promise.resolve([]),
    hasTp ? fetchDelivery(accessToken) : Promise.resolve({ coins: 0, items: [] }),
    hasTp ? fetchCurrentOrders(accessToken, 'buys') : Promise.resolve([]),
    hasTp ? fetchCurrentOrders(accessToken, 'sells') : Promise.resolve([]),
    hasInventories ? fetchBank(accessToken) : Promise.resolve([]),
    hasInventories ? fetchMaterials(accessToken) : Promise.resolve([]),
  ])

  const walletGold = wallet.find((row) => row.id === 1)?.value ?? 0
  const deliveryGold = delivery.coins ?? 0
  const lockedInBuyOrders = buys.reduce((sum, row) => sum + row.price * row.quantity, 0)
  const sellListingsGross = sells.reduce((sum, row) => sum + row.price * row.quantity, 0)
  const sellListingsNet = sells.reduce(
    (sum, row) => sum + row.price * row.quantity * (1 - EXCHANGE_FEE_RATE),
    0,
  )

  const deliveryItemIds = delivery.items.map((row) => row.id)
  const storageIds = [...bank, ...materials].map((row) => row.id)
  const priceIds = [...new Set([...deliveryItemIds, ...storageIds])]
  const prices = priceIds.length > 0 ? await fetchCommercePrices(priceIds) : []
  const priceMap = new Map(prices.map((row) => [row.id, row]))

  const deliveryItemsValue = delivery.items.reduce((sum, row) => {
    const buy = priceMap.get(row.id)?.buys.unit_price ?? 0
    return sum + buy * row.count
  }, 0)

  const storageEstimate = hasInventories
    ? [...bank, ...materials].reduce((sum, row) => {
        const buy = priceMap.get(row.id)?.buys.unit_price ?? 0
        return sum + buy * row.count
      }, 0)
    : null

  const liquidity: LiquidityBreakdown = {
    walletGold,
    deliveryGold,
    lockedInBuyOrders,
    sellListingsGross,
    sellListingsNet,
    deliveryItemsValue,
    totalLiquid:
      walletGold + deliveryGold + lockedInBuyOrders + sellListingsNet + deliveryItemsValue,
  }

  let gw2eSummary: number | null = null
  const gw2eParts: Record<string, number | null> = {}
  let partial = true
  let note =
    'Liquid TP estimate uses wallet, delivery, open orders, and delivery items at highest buy bids. Full account value excludes characters and collections.'

  if (hasInventories && hasWallet && hasTp) {
    try {
      const bankCounts = await fetchBankItemCounts(accessToken)
      const accountData = {
        wallet,
        bank,
        materials,
        shared: [] as InventorySlot[],
        characters: [] as unknown[],
        skins: [] as unknown[],
        dyes: [] as unknown[],
        minis: [] as unknown[],
        outfits: [] as unknown[],
        recipes: [] as unknown[],
        finishers: [] as unknown[],
        commerce: { buys, sells },
        delivery,
      }

      const ids = allItemIds(accountData as never)
      const itemPrices = ids.length > 0 ? await fetchCommercePrices(ids) : []
      const values = {
        items: buildItemValues(ids, itemPrices),
        skins: {} as Record<number, { value: number }>,
        currencies: {} as Record<number, { value: number }>,
      }

      const result = accountValue(accountData as never, values as never)
      gw2eSummary = result.summary?.value ?? null
      for (const [key, part] of Object.entries(result)) {
        if (key === 'summary') continue
        const value = (part as { value?: number } | null)?.value
        gw2eParts[key] = typeof value === 'number' ? value : null
      }
      partial = Object.keys(bankCounts).length > 0
      note =
        'gw2efficiency engine on wallet, bank, materials, and trading post data. Characters, skins, and achievements are not included without deeper scans.'
    } catch {
      note = 'Could not run full gw2efficiency valuation; showing liquid estimate only.'
    }
  }

  return { liquidity, storageEstimate, gw2eSummary, gw2eParts, partial, note }
}

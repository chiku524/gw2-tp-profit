import accountValue, { allItemIds } from 'gw2e-account-value'
import {
  fetchAccountRecipes,
  fetchCharacterNames,
  fetchCharacters,
  fetchCommercePrices,
  fetchCurrentOrders,
  fetchDelivery,
} from './gw2Api'
import { gw2Fetch } from './gw2Fetch'
import { EXCHANGE_FEE_RATE } from './profit'
import type { Gw2Character } from '../types'

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
  characterCount: number
  charactersIncluded: boolean
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

async function loadCharacters(
  accessToken: string,
  hasCharacters: boolean,
  hasInventories: boolean,
): Promise<Gw2Character[]> {
  if (!hasCharacters || !hasInventories) return []

  const names = await fetchCharacterNames(accessToken)
  if (names.length === 0) return []

  return fetchCharacters(accessToken, names)
}

export async function calculateAccountValue(
  accessToken: string,
  permissions: Set<string>,
): Promise<AccountValueBreakdown> {
  const hasWallet = permissions.has('wallet')
  const hasTp = permissions.has('tradingpost')
  const hasInventories = permissions.has('inventories')
  const hasCharacters = permissions.has('characters')
  const hasUnlocks = permissions.has('unlocks')

  const [wallet, delivery, buys, sells, bank, materials, characters, recipes] = await Promise.all([
    hasWallet ? fetchWallet(accessToken) : Promise.resolve([]),
    hasTp ? fetchDelivery(accessToken) : Promise.resolve({ coins: 0, items: [] }),
    hasTp ? fetchCurrentOrders(accessToken, 'buys') : Promise.resolve([]),
    hasTp ? fetchCurrentOrders(accessToken, 'sells') : Promise.resolve([]),
    hasInventories ? fetchBank(accessToken) : Promise.resolve([]),
    hasInventories ? fetchMaterials(accessToken) : Promise.resolve([]),
    loadCharacters(accessToken, hasCharacters, hasInventories),
    hasUnlocks ? fetchAccountRecipes(accessToken).catch(() => []) : Promise.resolve([]),
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

  const charactersIncluded = characters.length > 0
  let gw2eSummary: number | null = null
  const gw2eParts: Record<string, number | null> = {}
  let partial = true
  let note =
    'Liquid TP estimate uses wallet, delivery, open orders, and delivery items at highest buy bids.'

  if (hasInventories && hasWallet && hasTp) {
    try {
      const accountData = {
        wallet,
        bank,
        materials,
        shared: [] as InventorySlot[],
        characters,
        skins: [] as unknown[],
        dyes: [] as unknown[],
        minis: [] as unknown[],
        outfits: [] as unknown[],
        recipes: recipes.map((id) => ({ id })),
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

      if (charactersIncluded) {
        partial = false
        note = `gw2efficiency valuation across wallet, bank, materials, trading post, and ${characters.length} character${characters.length === 1 ? '' : 's'} (bags + equipment). Skins, achievements, and homestead are not scanned.`
      } else if (!hasCharacters) {
        note =
          'Add Characters permission to include bag and equipment value. Currently: wallet, bank, materials, and trading post only.'
      } else if (!hasInventories) {
        note =
          'Add Inventories permission to include bank, materials, and character bags. Currently: wallet and trading post only.'
      } else {
        note =
          'gw2efficiency valuation on wallet, bank, materials, and trading post. No characters found on this account.'
      }
    } catch {
      note = 'Could not run full gw2efficiency valuation; showing liquid estimate only.'
    }
  } else if (!hasCharacters || !hasInventories) {
    note += ' Add Characters + Inventories permissions for full storage and character scans.'
  }

  return {
    liquidity,
    storageEstimate,
    gw2eSummary,
    gw2eParts,
    characterCount: characters.length,
    charactersIncluded,
    partial,
    note,
  }
}

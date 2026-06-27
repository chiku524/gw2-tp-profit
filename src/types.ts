export type AppTab =
  | 'market'
  | 'scanner'
  | 'watchlist'
  | 'calculator'
  | 'crafts'
  | 'account'
  | 'settings'

export type CommercePrice = {
  id: number
  whitelisted: boolean
  buys: {
    quantity: number
    unit_price: number
  }
  sells: {
    quantity: number
    unit_price: number
  }
}

export type Gw2Item = {
  id: number
  name: string
  icon?: string
  rarity?: string
  type?: string
  chat_link?: string
  details?: {
    type?: string
    weight_class?: string
    material_type?: string
    infusion_type?: string
  }
}

export type Gw2Recipe = {
  id: number
  type: string
  output_item_id: number
  output_item_count: number
  min_rating?: number
  time_to_craft_ms?: number
  disciplines?: string[]
  flags?: string[]
  ingredients: { item_id: number; count: number }[]
  chat_link?: string
}

export type TokenInfo = {
  id: string
  name: string
  permissions: string[]
}

export type Gw2Account = {
  id: string
  name: string
  age: number
  access: string[]
  commander: boolean
  fractal_level: number
  daily_ap: number
  monthly_ap: number
  wvw_rank: number
}

export type CommerceTransaction = {
  id: number
  item_id: number
  price: number
  quantity: number
  created: string
  purchased?: string
}

export type CommerceDelivery = {
  coins: number
  items: { id: number; count: number }[]
}

export type CommerceListing = {
  listings: number
  unit_price: number
  quantity: number
}

export type CommerceListings = {
  id: number
  buys: CommerceListing[]
  sells: CommerceListing[]
}

export type GemExchange = {
  coins_per_gem: number
  quantity: number
  gems: number
}

export type WatchlistSnapshot = {
  itemId: number
  name: string
  icon?: string
  buyPrice: number
  sellPrice: number
  buyVolume?: number
  sellVolume?: number
  instantProfit: number
  instantRoi: number
  listingProfit: number
  listingRoi: number
  spreadPct: number
  liquidityScore?: number
  riskFlags?: RiskFlag[]
}

export type ItemCategoryFilter =
  | 'materials'
  | 'consumables'
  | 'gear'
  | 'upgrades'
  | 'containers'
  | 'other'

export type ScanFilters = {
  minProfit: number
  minRoi: number
  minVolume: number
  f2pOnly: boolean
  maxItems: number
  categories: ItemCategoryFilter[]
  disciplines: string[]
  subtypes: string[]
}

export type FlipSortKey = 'profit' | 'roi' | 'spread' | 'volume' | 'name' | 'buy' | 'sell' | 'liquidity'

export type RiskFlagKind =
  | 'low_volume'
  | 'wide_spread'
  | 'expansion_gated'
  | 'thin_book'
  | 'high_fee_drag'
  | 'stale_orders'

export type RiskFlag = {
  kind: RiskFlagKind
  label: string
  severity: 'warn' | 'info'
}

export type PriceSignal = {
  kind: string
  label: string
  strength: 'up' | 'down' | 'neutral'
}

export type PriceSnapshot = {
  t: number
  buy: number
  sell: number
}

export type FlipOpportunity = {
  itemId: number
  itemName: string
  icon?: string
  buyPrice: number
  sellPrice: number
  instantProfit: number
  instantRoi: number
  buyVolume: number
  sellVolume: number
  listingProfit: number
  listingRoi: number
  whitelisted: boolean
  spreadPct?: number
  itemType?: string
  itemCategory?: ItemCategoryFilter
  itemDisciplines?: string[]
  itemTags?: string[]
  liquidityScore?: number
  riskFlags?: RiskFlag[]
}

export type ScanProgress = {
  phase: 'idle' | 'loading-ids' | 'loading-prices' | 'loading-items' | 'done' | 'error'
  totalIds: number
  loadedPrices: number
  message?: string
}

export type OrderRow = {
  id: number
  itemId: number
  itemName: string
  icon?: string
  side: 'buy' | 'sell'
  yourPrice: number
  marketPrice: number
  quantity: number
  created: string
  status: 'competitive' | 'undercut' | 'outbid' | 'unknown'
  gap: number
}

export type HistorySummary = {
  buySpend: number
  sellRevenueGross: number
  sellRevenueNet: number
  listingFees: number
  estimatedNet: number
  buyCount: number
  sellCount: number
}

export type CraftingResult = {
  outputItemId: number
  outputItemName: string
  icon?: string
  recipeId: number
  craftCost: number
  sellRevenue: number
  listingRevenue: number
  instantProfit: number
  listingProfit: number
  disciplines: string[]
}

export type ProfitMoveKind = 'refinement' | 'craft'

export type ProfitMoveInput = {
  itemId: number
  name: string
  count: number
  unitCost: number
}

export type ProfitMoveSortMode = 'profit' | 'roi' | 'volume_weighted'

export type ProfitMove = {
  recipeId: number
  kind: ProfitMoveKind
  outputItemId: number
  outputItemName: string
  outputIcon?: string
  outputCount: number
  inputs: ProfitMoveInput[]
  inputCost: number
  outputListPrice: number
  listingProfit: number
  listingRoi: number
  instantProfit: number
  disciplines: string[]
  maxCraftVolume: number
  outputVolume: number
  bottleneckVolume: number
  volumeWeightedProfit: number
  stackProfit: number
}

export type ProfitMoveFilters = {
  minProfit: number
  minRoi: number
  kinds: ProfitMoveKind[]
  maxResults: number
  onlyCraftable: boolean
  disciplines: string[]
  sortMode: ProfitMoveSortMode
  minVolume: number
}

export type Gw2CharacterBag = {
  id: number
  size: number
  inventory: (Gw2InventoryItem | null)[]
}

export type Gw2InventoryItem = {
  id: number
  count: number
  binding?: string
  bound_to?: string
  upgrades?: number[]
  infusions?: number[]
  skin?: number
}

export type Gw2CharacterEquipment = Gw2InventoryItem & {
  slot: string
  location?: string
}

export type Gw2Character = {
  name: string
  crafting: { discipline: string; rating: number; active: boolean }[]
  equipment: Gw2CharacterEquipment[]
  bags: (Gw2CharacterBag | null)[]
  last_modified?: string
}

export type StorageSellOpportunity = {
  itemId: number
  name: string
  icon?: string
  quantity: number
  sources: string
  highestBuy: number
  lowestSell: number
  listRevenue: number
  instantRevenue: number
  score: number
}

export type BulkCraftPlan = {
  move: ProfitMove
  runs: number
  totalInputCost: number
  totalOutputValue: number
  totalProfit: number
  shoppingList: { itemId: number; name: string; needed: number; have: number; buy: number }[]
}

export type WealthGoal = {
  id: string
  label: string
  targetCopper: number
  metric: 'liquid' | 'total' | 'wallet'
}

export type FlipJournalEntry = {
  id: string
  itemId: number
  itemName: string
  note: string
  tags: string[]
  createdAt: number
}

export type ProfitChain = {
  outputItemId: number
  outputName: string
  outputIcon?: string
  steps: { label: string; cost: number }[]
  totalCost: number
  listProfit: number
  listingRoi: number
  kind: ProfitMoveKind
}

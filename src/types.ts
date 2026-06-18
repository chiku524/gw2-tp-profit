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
  instantProfit: number
  instantRoi: number
  listingProfit: number
  listingRoi: number
  spreadPct: number
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
}

export type FlipSortKey = 'profit' | 'roi' | 'spread' | 'volume' | 'name' | 'buy' | 'sell'

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
}

export type ProfitMoveFilters = {
  minProfit: number
  minRoi: number
  kinds: ProfitMoveKind[]
  maxResults: number
  onlyCraftable: boolean
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

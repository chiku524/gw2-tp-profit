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

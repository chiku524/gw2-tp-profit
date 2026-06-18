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

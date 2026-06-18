import type { FlipOpportunity, WatchlistSnapshot } from '../types'

export function liquidityScore(row: {
  buyVolume: number
  sellVolume: number
  listingProfit: number
}): number {
  const volume = Math.min(row.buyVolume, row.sellVolume)
  if (volume <= 0 || row.listingProfit <= 0) return 0
  return Math.round(Math.log10(volume + 1) * 100 + row.listingProfit)
}

export function enrichFlipLiquidity<T extends FlipOpportunity>(row: T): T {
  return { ...row, liquidityScore: liquidityScore(row) }
}

export function enrichWatchlistLiquidity(row: WatchlistSnapshot): WatchlistSnapshot {
  return {
    ...row,
    liquidityScore: liquidityScore({
      buyVolume: row.buyVolume ?? 0,
      sellVolume: row.sellVolume ?? 0,
      listingProfit: row.listingProfit,
    }),
  }
}

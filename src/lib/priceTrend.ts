import { getLocalPriceHistory } from './priceHistory'

export type PriceTrend = 'up' | 'down' | 'flat'

/** Compare latest profit spread vs ~24h ago from local snapshots. */
export function profitTrend(itemId: number): PriceTrend | null {
  const history = getLocalPriceHistory(itemId)
  if (history.length < 2) return null

  const latest = history[history.length - 1]!
  const dayAgo = history.find((row) => latest.t - row.t >= 20 * 3_600_000) ?? history[0]!

  const latestSpread = Math.max(0, latest.buy - latest.sell)
  const pastSpread = Math.max(0, dayAgo.buy - dayAgo.sell)

  if (pastSpread <= 0) return latestSpread > 0 ? 'up' : null

  const changePct = ((latestSpread - pastSpread) / pastSpread) * 100
  if (changePct >= 10) return 'up'
  if (changePct <= -10) return 'down'
  return 'flat'
}

export function trendLabel(trend: PriceTrend | null): string {
  if (trend === 'up') return '↑'
  if (trend === 'down') return '↓'
  if (trend === 'flat') return '→'
  return ''
}

export function trendTitle(trend: PriceTrend | null): string {
  if (trend === 'up') return 'Spread widening vs ~24h ago'
  if (trend === 'down') return 'Spread tightening vs ~24h ago'
  if (trend === 'flat') return 'Spread stable vs ~24h ago'
  return ''
}

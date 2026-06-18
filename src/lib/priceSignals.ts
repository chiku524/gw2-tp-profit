import type { PriceSnapshot, PriceSignal } from '../types'

export function computePriceSignals(history: PriceSnapshot[]): PriceSignal[] {
  if (history.length < 3) return []

  const signals: PriceSignal[] = []
  const latest = history[history.length - 1]!
  const weekAgo = history.find((row) => latest.t - row.t >= 7 * 86_400_000) ?? history[0]!

  if (weekAgo.buy > 0) {
    const buyChange = ((latest.buy - weekAgo.buy) / weekAgo.buy) * 100
    if (buyChange <= -8) {
      signals.push({
        kind: 'buy_dip',
        label: `Buy cost down ${Math.abs(buyChange).toFixed(0)}% vs ~7d`,
        strength: 'up',
      })
    } else if (buyChange >= 8) {
      signals.push({
        kind: 'buy_spike',
        label: `Buy cost up ${buyChange.toFixed(0)}% vs ~7d`,
        strength: 'down',
      })
    }
  }

  if (weekAgo.sell > 0) {
    const sellChange = ((latest.sell - weekAgo.sell) / weekAgo.sell) * 100
    if (sellChange >= 8) {
      signals.push({
        kind: 'sell_peak',
        label: `Sell bids up ${sellChange.toFixed(0)}% — good time to list`,
        strength: 'up',
      })
    } else if (sellChange <= -8) {
      signals.push({
        kind: 'sell_soft',
        label: `Sell bids down ${Math.abs(sellChange).toFixed(0)}% vs ~7d`,
        strength: 'down',
      })
    }
  }

  const recent = history.slice(-14)
  const avgSpread =
    recent.reduce((sum, row) => sum + Math.max(0, row.buy - row.sell), 0) / recent.length
  const currentSpread = Math.max(0, latest.buy - latest.sell)
  if (avgSpread > 0 && currentSpread < avgSpread * 0.7) {
    signals.push({ kind: 'spread_tight', label: 'Spread tighter than recent avg', strength: 'neutral' })
  }

  const highs = history.map((row) => row.sell).filter((value) => value > 0)
  if (highs.length > 0 && latest.sell >= Math.max(...highs) * 0.98) {
    signals.push({ kind: 'near_high', label: 'Near recent sell bid high', strength: 'up' })
  }

  return signals
}

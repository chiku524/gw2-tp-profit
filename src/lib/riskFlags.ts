import { LISTING_FEE_RATE, EXCHANGE_FEE_RATE } from './profit'
import type { FlipOpportunity, OrderRow, RiskFlag, WatchlistSnapshot } from '../types'

export function riskFlagsForFlip(row: FlipOpportunity): RiskFlag[] {
  const flags: RiskFlag[] = []
  const minVol = Math.min(row.buyVolume, row.sellVolume)

  if (!row.whitelisted) {
    flags.push({ kind: 'expansion_gated', label: 'HoT/PoF item', severity: 'info' })
  }
  if (minVol < 10) {
    flags.push({ kind: 'low_volume', label: 'Low volume', severity: 'warn' })
  }
  if (minVol < 3) {
    flags.push({ kind: 'thin_book', label: 'Thin order book', severity: 'warn' })
  }
  if ((row.spreadPct ?? 0) > 80) {
    flags.push({ kind: 'wide_spread', label: 'Wide spread', severity: 'warn' })
  }
  if (row.listingProfit > 0 && row.listingProfit < row.buyPrice * (LISTING_FEE_RATE + EXCHANGE_FEE_RATE)) {
    flags.push({ kind: 'high_fee_drag', label: 'Fees eat margin', severity: 'info' })
  }

  return flags
}

export function enrichFlipRisk<T extends FlipOpportunity>(row: T): T {
  return { ...row, riskFlags: riskFlagsForFlip(row) }
}

export function riskFlagsForWatchlist(row: WatchlistSnapshot): RiskFlag[] {
  return riskFlagsForFlip({
    itemId: row.itemId,
    itemName: row.name,
    icon: row.icon,
    buyPrice: row.buyPrice,
    sellPrice: row.sellPrice,
    instantProfit: row.instantProfit,
    instantRoi: row.instantRoi,
    buyVolume: 0,
    sellVolume: 0,
    listingProfit: row.listingProfit,
    listingRoi: row.listingRoi,
    whitelisted: true,
    spreadPct: row.spreadPct,
  }).filter((flag) => flag.kind !== 'low_volume' && flag.kind !== 'thin_book')
}

export function orderRiskFlags(orders: OrderRow[]): RiskFlag[] {
  const stale = orders.filter((row) => row.status === 'undercut' || row.status === 'outbid')
  if (stale.length === 0) return []
  return [{ kind: 'stale_orders', label: `${stale.length} orders need attention`, severity: 'warn' }]
}

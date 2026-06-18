import type { OrderRow, WatchlistSnapshot } from '../types'
import {
  loadPriceAlertRules,
  readCooldownMap,
  writeCooldownMap,
  type PriceAlertRule,
} from './priceAlerts'

const COOLDOWN_MS = 15 * 60_000

export function evaluateExtendedAlerts(
  snapshots: WatchlistSnapshot[],
  orders: OrderRow[] = [],
): string[] {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return []

  const rules = loadPriceAlertRules().filter((rule) => rule.enabled)
  if (rules.length === 0) return []

  const cooldown = readCooldownMap()
  const now = Date.now()
  const fired: string[] = []
  let changed = false

  for (const rule of rules) {
    const key = `${rule.itemId}:${rule.alertType ?? 'profit'}`
    if (cooldown[key] && now - cooldown[key] < COOLDOWN_MS) continue

    const message = evaluateRule(rule, snapshots, orders)
    if (!message) continue

    new Notification('GW2 TP alert', {
      body: message,
      tag: `gw2-tp-alert-${key}`,
    })
    cooldown[key] = now
    changed = true
    fired.push(message)
  }

  if (changed) writeCooldownMap(cooldown)
  return fired
}

function evaluateRule(
  rule: PriceAlertRule,
  snapshots: WatchlistSnapshot[],
  orders: OrderRow[],
): string | null {
  const snapshot = snapshots.find((row) => row.itemId === rule.itemId)
  const type = rule.alertType ?? 'profit'

  if (type === 'profit' && snapshot) {
    if (snapshot.listingProfit >= rule.minProfit && snapshot.listingRoi >= rule.minRoi) {
      return `${snapshot.name}: ${snapshot.listingProfit}c profit (${snapshot.listingRoi.toFixed(1)}% ROI)`
    }
  }

  if (type === 'price_below' && snapshot && rule.maxBuyPrice) {
    if (snapshot.buyPrice <= rule.maxBuyPrice) {
      return `${snapshot.name}: buy cost ${snapshot.buyPrice}c (at/below ${rule.maxBuyPrice}c)`
    }
  }

  if (type === 'spread_wide' && snapshot && rule.minSpreadPct) {
    if (snapshot.spreadPct >= rule.minSpreadPct) {
      return `${snapshot.name}: spread ${snapshot.spreadPct.toFixed(1)}%`
    }
  }

  if (type === 'undercut' && rule.itemId) {
    const bad = orders.filter(
      (row) => row.itemId === rule.itemId && (row.status === 'undercut' || row.status === 'outbid'),
    )
    if (bad.length > 0) {
      return `${rule.name}: order undercut/outbid on ${bad.length} listing${bad.length === 1 ? '' : 's'}`
    }
  }

  return null
}

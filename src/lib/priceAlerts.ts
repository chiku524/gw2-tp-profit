import type { WatchlistSnapshot } from '../types'

export type PriceAlertRule = {
  itemId: number
  name: string
  minProfit: number
  minRoi: number
  enabled: boolean
}

const RULES_KEY = 'gw2-tp-price-alerts'
const COOLDOWN_KEY = 'gw2-tp-alert-cooldown'
const COOLDOWN_MS = 15 * 60_000

function readRules(): PriceAlertRule[] {
  try {
    const raw = localStorage.getItem(RULES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PriceAlertRule[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRules(rules: PriceAlertRule[]): void {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules))
}

function readCooldown(): Record<string, number> {
  try {
    const raw = localStorage.getItem(COOLDOWN_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, number>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeCooldown(map: Record<string, number>): void {
  localStorage.setItem(COOLDOWN_KEY, JSON.stringify(map))
}

export function loadPriceAlertRules(): PriceAlertRule[] {
  return readRules()
}

export function savePriceAlertRules(rules: PriceAlertRule[]): void {
  writeRules(rules)
}

export function upsertPriceAlertRule(rule: PriceAlertRule): PriceAlertRule[] {
  const rules = readRules()
  const index = rules.findIndex((row) => row.itemId === rule.itemId)
  if (index >= 0) rules[index] = rule
  else rules.push(rule)
  writeRules(rules)
  return rules
}

export function removePriceAlertRule(itemId: number): PriceAlertRule[] {
  const rules = readRules().filter((row) => row.itemId !== itemId)
  writeRules(rules)
  return rules
}

export function notificationPermission(): NotificationPermission {
  if (typeof Notification === 'undefined') return 'denied'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied'
  if (Notification.permission === 'default') {
    return Notification.requestPermission()
  }
  return Notification.permission
}

export function evaluatePriceAlerts(snapshots: WatchlistSnapshot[]): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

  const rules = readRules().filter((rule) => rule.enabled)
  if (rules.length === 0) return

  const cooldown = readCooldown()
  const now = Date.now()
  let cooldownChanged = false

  for (const rule of rules) {
    const snapshot = snapshots.find((row) => row.itemId === rule.itemId)
    if (!snapshot) continue
    if (snapshot.listingProfit < rule.minProfit || snapshot.listingRoi < rule.minRoi) continue

    const key = String(rule.itemId)
    if (cooldown[key] && now - cooldown[key] < COOLDOWN_MS) continue

    new Notification('GW2 TP alert', {
      body: `${snapshot.name}: ${snapshot.listingProfit}c list profit (${snapshot.listingRoi.toFixed(1)}% ROI)`,
      tag: `gw2-tp-alert-${rule.itemId}`,
    })

    cooldown[key] = now
    cooldownChanged = true
  }

  if (cooldownChanged) writeCooldown(cooldown)
}

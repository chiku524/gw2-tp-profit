export type Gw2Permission =
  | 'account'
  | 'builds'
  | 'characters'
  | 'guilds'
  | 'inventories'
  | 'progression'
  | 'pvp'
  | 'tradingpost'
  | 'unlocks'
  | 'wallet'
  | 'wvw'

export const PERMISSION_LABELS: Record<Gw2Permission, string> = {
  account: 'Account',
  builds: 'Builds',
  characters: 'Characters',
  guilds: 'Guilds',
  inventories: 'Inventories',
  progression: 'Progression',
  pvp: 'PvP',
  tradingpost: 'Trading Post',
  unlocks: 'Unlocks',
  wallet: 'Wallet',
  wvw: 'WvW',
}

export const FEATURE_REQUIREMENTS = {
  orders: ['account', 'tradingpost'] as const,
  delivery: ['account', 'tradingpost'] as const,
  history: ['account', 'tradingpost'] as const,
  craftingBank: ['account', 'inventories'] as const,
  accountValue: ['account', 'wallet', 'tradingpost', 'inventories', 'characters'] as const,
  recipeUnlocks: ['account', 'unlocks'] as const,
  craftingLevels: ['account', 'characters'] as const,
}

export const FEATURE_LABELS: Record<keyof typeof FEATURE_REQUIREMENTS, string> = {
  orders: 'My orders & undercut alerts',
  delivery: 'Delivery box',
  history: 'P&L history & FIFO matcher',
  craftingBank: 'Bank materials in craft profit',
  accountValue: 'Full account valuation',
  recipeUnlocks: 'Filter to discovered recipes',
  craftingLevels: 'Character crafting level checks',
}

export function missingPermissions(
  granted: string[],
  required: readonly string[],
): string[] {
  return required.filter((permission) => !granted.includes(permission))
}

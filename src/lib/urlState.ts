import type { AppTab } from '../types'

export type AccountSection =
  | 'orders'
  | 'delivery'
  | 'history'
  | 'crafting'
  | 'value'
  | 'capital'
  | 'sell'

export type UrlState = {
  tab: AppTab
  accountSection?: AccountSection
}

const TABS: AppTab[] = [
  'market',
  'scanner',
  'watchlist',
  'calculator',
  'crafts',
  'account',
  'settings',
]

const SECTIONS: AccountSection[] = [
  'orders',
  'capital',
  'sell',
  'delivery',
  'history',
  'value',
  'crafting',
]

export function parseHash(hash = window.location.hash): UrlState | null {
  const raw = hash.replace(/^#\/?/, '').trim()
  if (!raw) return null

  const [tabPart, sectionPart] = raw.split('/')
  if (!TABS.includes(tabPart as AppTab)) return null

  const tab = tabPart as AppTab
  if (tab !== 'account') return { tab }

  if (sectionPart && SECTIONS.includes(sectionPart as AccountSection)) {
    return { tab, accountSection: sectionPart as AccountSection }
  }

  return { tab, accountSection: 'orders' }
}

export function writeHash(state: UrlState): void {
  const path =
    state.tab === 'account' && state.accountSection
      ? `#/${state.tab}/${state.accountSection}`
      : `#/${state.tab}`

  if (window.location.hash !== path) {
    window.history.replaceState(null, '', path)
  }
}

export function accountSectionFromHash(): AccountSection {
  return parseHash()?.accountSection ?? 'orders'
}

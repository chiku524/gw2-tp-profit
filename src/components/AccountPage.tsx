import { useEffect, useState } from 'react'
import { useApiKey } from '../context/ApiKeyProvider'
import { AccountValuePanel } from './account/AccountValuePanel'
import { CapitalDashboardPanel } from './account/CapitalDashboardPanel'
import { CraftingPanel } from './account/CraftingPanel'
import { DeliveryPanel } from './account/DeliveryPanel'
import { HistoryPanel } from './account/HistoryPanel'
import { MyOrdersPanel } from './account/MyOrdersPanel'
import { SellFromStoragePanel } from './account/SellFromStoragePanel'
import type { Gw2Item } from '../types'

type AccountSection = 'orders' | 'delivery' | 'history' | 'crafting' | 'value' | 'capital' | 'sell'

type Props = {
  section?: AccountSection
  onSectionChange?: (section: AccountSection) => void
  craftPreload?: Gw2Item | null
  onCraftPreloadConsumed?: () => void
}

export function AccountPage({
  section: controlledSection,
  onSectionChange,
  craftPreload,
  onCraftPreloadConsumed,
}: Props) {
  const { isConnected, account } = useApiKey()
  const [internalSection, setInternalSection] = useState<AccountSection>('orders')
  const section = controlledSection ?? internalSection

  const setSection = (next: AccountSection) => {
    if (onSectionChange) onSectionChange(next)
    else setInternalSection(next)
  }

  useEffect(() => {
    if (craftPreload) setSection('crafting')
  }, [craftPreload])

  if (!isConnected) {
    return (
      <section className="panel">
        <h2>Account features</h2>
        <p className="empty-state">
          Connect your ArenaNet API key in Settings to view open orders, delivery box contents, flip P&amp;L,
          capital, sell opportunities, account value, and crafting profit with your bank materials.
        </p>
      </section>
    )
  }

  return (
    <div className="account-page">
      <p className="account-greeting">
        Signed in as <strong>{account?.name}</strong>
      </p>

      <nav className="subtabs" aria-label="Account sections">
        <button type="button" className={section === 'orders' ? 'active' : ''} onClick={() => setSection('orders')}>
          Orders
        </button>
        <button type="button" className={section === 'capital' ? 'active' : ''} onClick={() => setSection('capital')}>
          Capital
        </button>
        <button type="button" className={section === 'sell' ? 'active' : ''} onClick={() => setSection('sell')}>
          Sell
        </button>
        <button type="button" className={section === 'delivery' ? 'active' : ''} onClick={() => setSection('delivery')}>
          Delivery
        </button>
        <button type="button" className={section === 'history' ? 'active' : ''} onClick={() => setSection('history')}>
          P&amp;L
        </button>
        <button type="button" className={section === 'value' ? 'active' : ''} onClick={() => setSection('value')}>
          Value
        </button>
        <button type="button" className={section === 'crafting' ? 'active' : ''} onClick={() => setSection('crafting')}>
          Crafting
        </button>
      </nav>

      {section === 'orders' ? <MyOrdersPanel /> : null}
      {section === 'capital' ? <CapitalDashboardPanel /> : null}
      {section === 'sell' ? <SellFromStoragePanel /> : null}
      {section === 'delivery' ? <DeliveryPanel /> : null}
      {section === 'history' ? <HistoryPanel /> : null}
      {section === 'value' ? <AccountValuePanel /> : null}
      {section === 'crafting' ? (
        <CraftingPanel preloadItem={craftPreload} onPreloadConsumed={onCraftPreloadConsumed} />
      ) : null}
    </div>
  )
}

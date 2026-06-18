import { useState } from 'react'
import { useApiKey } from '../context/ApiKeyProvider'
import { CraftingPanel } from './account/CraftingPanel'
import { DeliveryPanel } from './account/DeliveryPanel'
import { HistoryPanel } from './account/HistoryPanel'
import { MyOrdersPanel } from './account/MyOrdersPanel'

type AccountSection = 'orders' | 'delivery' | 'history' | 'crafting'

export function AccountPage() {
  const { isConnected, account } = useApiKey()
  const [section, setSection] = useState<AccountSection>('orders')

  if (!isConnected) {
    return (
      <section className="panel">
        <h2>Account features</h2>
        <p className="empty-state">
          Connect your ArenaNet API key in Settings to view open orders, delivery box contents, flip P&amp;L,
          and crafting profit with your bank materials.
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
        <button
          type="button"
          className={section === 'orders' ? 'active' : ''}
          onClick={() => setSection('orders')}
        >
          My orders
        </button>
        <button
          type="button"
          className={section === 'delivery' ? 'active' : ''}
          onClick={() => setSection('delivery')}
        >
          Delivery
        </button>
        <button
          type="button"
          className={section === 'history' ? 'active' : ''}
          onClick={() => setSection('history')}
        >
          P&amp;L history
        </button>
        <button
          type="button"
          className={section === 'crafting' ? 'active' : ''}
          onClick={() => setSection('crafting')}
        >
          Crafting
        </button>
      </nav>

      {section === 'orders' ? <MyOrdersPanel /> : null}
      {section === 'delivery' ? <DeliveryPanel /> : null}
      {section === 'history' ? <HistoryPanel /> : null}
      {section === 'crafting' ? <CraftingPanel /> : null}
    </div>
  )
}

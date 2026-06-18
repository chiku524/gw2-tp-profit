import { AccountPulse } from './AccountPulse'
import { RecentItemsPanel } from './RecentItemsPanel'
import { useEffect, useState } from 'react'
import { useItemDetail } from '../context/ItemDetailProvider'
import { useWatchlist } from '../context/WatchlistProvider'
import { formatCoins } from '../lib/coins'
import { fetchCommercePrices, fetchGemExchange, fetchItems } from '../lib/gw2Api'
import { QUICK_PICKS } from '../lib/scanPresets'
import type { FlipOpportunity, GemExchange } from '../types'

type Props = {
  lastScan: FlipOpportunity[]
  onBrowseGroup: (itemIds: number[]) => void
  onGoAccount: () => void
}

export function MarketDashboard({ lastScan, onBrowseGroup, onGoAccount }: Props) {
  const { entries } = useWatchlist()
  const { openItem } = useItemDetail()
  const [gems, setGems] = useState<GemExchange[]>([])
  const [quickPrices, setQuickPrices] = useState<FlipOpportunity[]>([])
  const [loadingPicks, setLoadingPicks] = useState(false)

  useEffect(() => {
    void fetchGemExchange()
      .then(setGems)
      .catch(() => setGems([]))
  }, [])

  useEffect(() => {
    if (entries.length === 0) return
    const ids = entries.slice(0, 6).map((entry) => entry.itemId)
    void (async () => {
      const [prices, items] = await Promise.all([fetchCommercePrices(ids), fetchItems(ids)])
      const itemMap = new Map(items.map((item) => [item.id, item]))
      setQuickPrices(
        prices.map((price) => {
          const item = itemMap.get(price.id)
          const buy = price.sells.unit_price
          const sell = price.buys.unit_price
          return {
            itemId: price.id,
            itemName: item?.name ?? `Item ${price.id}`,
            icon: item?.icon,
            buyPrice: buy,
            sellPrice: sell,
            instantProfit: sell - buy,
            instantRoi: buy > 0 ? ((sell - buy) / buy) * 100 : 0,
            buyVolume: price.sells.quantity,
            sellVolume: price.buys.quantity,
            listingProfit: 0,
            listingRoi: 0,
            whitelisted: price.whitelisted,
          }
        }),
      )
    })()
  }, [entries])

  const loadQuickPick = async (itemIds: number[]) => {
    setLoadingPicks(true)
    try {
      onBrowseGroup(itemIds)
    } finally {
      setLoadingPicks(false)
    }
  }

  const bestGem = gems[0]

  return (
    <div className="market-dashboard">
      <section className="panel dashboard-hero">
        <h2>Market pulse</h2>
        <p className="hint">Surf the trading post — search any item, star your watchlist, or jump into a quick scan.</p>
        <div className="stat-grid">
          <div>
            <span>Gem → gold</span>
            <strong>{bestGem ? formatCoins(bestGem.coins_per_gem) : '—'}</strong>
            <small>per gem (live rate)</small>
          </div>
          <div>
            <span>Watchlist</span>
            <strong>{entries.length}</strong>
            <small>tracked items</small>
          </div>
          <div>
            <span>Last scan</span>
            <strong>{lastScan.length}</strong>
            <small>opportunities found</small>
          </div>
        </div>
      </section>

      <AccountPulse onGoAccount={onGoAccount} />

      <section className="panel">
        <h3>Quick browse</h3>
        <div className="chip-row">
          {QUICK_PICKS.map((group) => (
            <button
              key={group.id}
              type="button"
              className="chip-btn"
              disabled={loadingPicks}
              onClick={() => void loadQuickPick(group.itemIds)}
            >
              {group.label}
            </button>
          ))}
        </div>
      </section>

      {entries.length > 0 && quickPrices.length > 0 ? (
        <section className="panel">
          <h3>Watchlist snapshot</h3>
          <ul className="snapshot-list">
            {quickPrices.map((row) => (
              <li key={row.itemId}>
                <button type="button" onClick={() => openItem({ id: row.itemId, name: row.itemName, icon: row.icon })}>
                  {row.icon ? <img src={row.icon} alt="" width={24} height={24} /> : null}
                  <span>{row.itemName}</span>
                  <strong className={row.instantProfit > 0 ? 'profit' : 'loss'}>
                    {formatCoins(row.instantProfit)}
                  </strong>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {lastScan.length > 0 ? (
        <section className="panel">
          <h3>Top from last scan</h3>
          <ul className="snapshot-list">
            {lastScan.slice(0, 5).map((row) => (
              <li key={row.itemId}>
                <button type="button" onClick={() => openItem({ id: row.itemId, name: row.itemName, icon: row.icon })}>
                  {row.icon ? <img src={row.icon} alt="" width={24} height={24} /> : null}
                  <span>{row.itemName}</span>
                  <strong className="profit">{formatCoins(row.instantProfit)}</strong>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <RecentItemsPanel />
    </div>
  )
}

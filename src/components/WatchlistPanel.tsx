import { loadWatchlistAutoRefresh, saveWatchlistAutoRefresh } from '../lib/preferences'
import { useCallback, useEffect, useState } from 'react'
import { useItemDetail } from '../context/ItemDetailProvider'
import { useWatchlist } from '../context/WatchlistProvider'
import { evaluatePriceAlerts } from '../lib/priceAlerts'
import { evaluateExtendedAlerts } from '../lib/alertEngine'
import { enrichWatchlistLiquidity } from '../lib/liquidity'
import { riskFlagsForWatchlist } from '../lib/riskFlags'
import { formatCoins } from '../lib/coins'
import { recordPriceSnapshots } from '../lib/priceHistory'
import { fetchCommercePrices, fetchItems } from '../lib/gw2Api'
import { enrichFlipOpportunities } from '../lib/itemNames'
import { opportunityFromPrice } from '../lib/profit'
import type { WatchlistSnapshot } from '../types'

export function WatchlistPanel() {
  const { entries, remove } = useWatchlist()
  const { openItem } = useItemDetail()
  const [rows, setRows] = useState<WatchlistSnapshot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(() => loadWatchlistAutoRefresh())

  const refresh = useCallback(async () => {
    if (entries.length === 0) {
      setRows([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const ids = entries.map((entry) => entry.itemId)
      const [prices, items] = await Promise.all([fetchCommercePrices(ids), fetchItems(ids)])
      recordPriceSnapshots(prices)
      const itemMap = new Map(items.map((item) => [item.id, item]))

      const opportunities = prices.map((price) => {
        const entry = entries.find((row) => row.itemId === price.id)
        const item = itemMap.get(price.id)
        return opportunityFromPrice(
          price,
          item?.name ?? entry?.name,
          item?.icon ?? entry?.icon,
          item?.type,
        )
      })

      const enriched = await enrichFlipOpportunities(
        opportunities.filter((row): row is NonNullable<typeof row> => row !== null),
      )

      const snapshots: WatchlistSnapshot[] = enriched.map((row) =>
        enrichWatchlistLiquidity({
          itemId: row.itemId,
          name: row.itemName,
          icon: row.icon,
          buyPrice: row.buyPrice,
          sellPrice: row.sellPrice,
          buyVolume: row.buyVolume,
          sellVolume: row.sellVolume,
          instantProfit: row.instantProfit,
          instantRoi: row.instantRoi,
          listingProfit: row.listingProfit,
          listingRoi: row.listingRoi,
          spreadPct: row.spreadPct ?? 0,
          riskFlags: riskFlagsForWatchlist({
            itemId: row.itemId,
            name: row.itemName,
            icon: row.icon,
            buyPrice: row.buyPrice,
            sellPrice: row.sellPrice,
            instantProfit: row.instantProfit,
            instantRoi: row.instantRoi,
            listingProfit: row.listingProfit,
            listingRoi: row.listingRoi,
            spreadPct: row.spreadPct ?? 0,
          }),
        }),
      )

      snapshots.sort((a, b) => b.listingProfit - a.listingProfit)
      setRows(snapshots)
      evaluatePriceAlerts(snapshots)
      evaluateExtendedAlerts(snapshots)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh watchlist')
    } finally {
      setLoading(false)
    }
  }, [entries])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!autoRefresh || entries.length === 0) return
    const timer = window.setInterval(() => void refresh(), 60_000)
    return () => window.clearInterval(timer)
  }, [autoRefresh, entries.length, refresh])

  const toggleAutoRefresh = () => {
    const next = !autoRefresh
    setAutoRefresh(next)
    saveWatchlistAutoRefresh(next)
  }

  if (entries.length === 0) {
    return (
      <section className="panel">
        <h2>Watchlist</h2>
        <p className="empty-state">
          Star items from search results or the item detail panel to track live spreads here.
        </p>
      </section>
    )
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Watchlist ({entries.length})</h2>
        <div className="header-actions">
          <label className="checkbox compact">
            <input type="checkbox" checked={autoRefresh} onChange={toggleAutoRefresh} />
            Auto-refresh
          </label>
          <button type="button" className="secondary" disabled={loading} onClick={() => void refresh()}>
            {loading ? 'Refreshing…' : 'Refresh all'}
          </button>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Buy</th>
              <th>Sell</th>
              <th>Profit</th>
              <th>ROI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.itemId} className="clickable-row">
                <td className="item-cell">
                  <button
                    type="button"
                    className="row-link"
                    onClick={() => openItem({ id: row.itemId, name: row.name, icon: row.icon })}
                  >
                    {row.icon ? <img src={row.icon} alt="" width={28} height={28} /> : null}
                    {row.name}
                  </button>
                </td>
                <td>{formatCoins(row.buyPrice)}</td>
                <td>{formatCoins(row.sellPrice)}</td>
                <td className={row.listingProfit > 0 ? 'profit' : 'loss'}>
                  {formatCoins(row.listingProfit)}
                </td>
                <td>{row.listingRoi.toFixed(1)}%</td>
                <td>
                  <button type="button" className="icon-btn" onClick={() => remove(row.itemId)} title="Remove">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

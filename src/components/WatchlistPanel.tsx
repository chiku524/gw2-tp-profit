import { loadWatchlistAutoRefresh, saveWatchlistAutoRefresh } from '../lib/preferences'
import { useCallback, useEffect, useState } from 'react'
import { useItemDetail } from '../context/ItemDetailProvider'
import { useWatchlist } from '../context/WatchlistProvider'
import { evaluatePriceAlerts } from '../lib/priceAlerts'
import { formatCoins } from '../lib/coins'
import { fetchCommercePrices, fetchItems } from '../lib/gw2Api'
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
      const itemMap = new Map(items.map((item) => [item.id, item]))

      const snapshots: WatchlistSnapshot[] = prices.map((price) => {
        const entry = entries.find((row) => row.itemId === price.id)
        const item = itemMap.get(price.id)
        const opportunity = opportunityFromPrice(
          price,
          item?.name ?? entry?.name ?? `Item ${price.id}`,
          item?.icon ?? entry?.icon,
        )
        return {
          itemId: price.id,
          name: opportunity?.itemName ?? item?.name ?? entry?.name ?? `Item ${price.id}`,
          icon: opportunity?.icon ?? item?.icon ?? entry?.icon,
          buyPrice: price.sells.unit_price,
          sellPrice: price.buys.unit_price,
          instantProfit: opportunity?.instantProfit ?? 0,
          instantRoi: opportunity?.instantRoi ?? 0,
          listingProfit: opportunity?.listingProfit ?? 0,
          listingRoi: opportunity?.listingRoi ?? 0,
          spreadPct: opportunity?.spreadPct ?? 0,
        }
      })

      snapshots.sort((a, b) => b.listingProfit - a.listingProfit)
      setRows(snapshots)
      evaluatePriceAlerts(snapshots)
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

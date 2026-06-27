import { useCallback, useEffect, useState } from 'react'
import { useApiKey } from '../../context/ApiKeyProvider'
import { useItemDetail } from '../../context/ItemDetailProvider'
import {
  adviseOrderCancellations,
  buildCapitalSnapshot,
  fetchAccountRawData,
} from '../../lib/accountSnapshot'
import { formatCoins } from '../../lib/coins'
import { enrichOrders } from '../../lib/orderRows'
import { fetchCommercePrices, fetchCurrentOrders, fetchItems } from '../../lib/gw2Api'
import type { OrderRow } from '../../types'

export function MyOrdersPanel() {
  const { apiKey, tokenInfo, canUse } = useApiKey()
  const { openItem } = useItemDetail()
  const [rows, setRows] = useState<OrderRow[]>([])
  const [slotCount, setSlotCount] = useState(0)
  const [slotLimit, setSlotLimit] = useState(250)
  const [cancelAdvice, setCancelAdvice] = useState<
    ReturnType<typeof adviseOrderCancellations>
  >([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!apiKey || !canUse('orders')) return
    setLoading(true)
    setError(null)

    try {
      const permissions = new Set(tokenInfo?.permissions ?? [])
      const [data, buys, sells] = await Promise.all([
        fetchAccountRawData(apiKey, permissions),
        fetchCurrentOrders(apiKey, 'buys'),
        fetchCurrentOrders(apiKey, 'sells'),
      ])
      const capital = buildCapitalSnapshot(data)
      setSlotCount(capital.orderSlotCount)
      setSlotLimit(capital.orderSlotLimit)

      const enriched = [
        ...(await enrichOrders(buys, 'buy')),
        ...(await enrichOrders(sells, 'sell')),
      ]
      enriched.sort((a, b) => {
        const rank = { undercut: 0, outbid: 0, unknown: 1, competitive: 2 }
        return rank[a.status] - rank[b.status] || b.gap - a.gap
      })
      setRows(enriched)

      const itemIds = [...new Set([...buys, ...sells].map((row) => row.item_id))]
      const prices = itemIds.length > 0 ? await fetchCommercePrices(itemIds) : []
      const marketMap = new Map(
        prices.map((price) => [price.id, { buy: price.buys.unit_price, sell: price.sells.unit_price }]),
      )
      const itemNames = new Map(
        (await fetchItems(itemIds)).map((item) => [item.id, item.name]),
      )
      setCancelAdvice(adviseOrderCancellations(buys, sells, marketMap, itemNames).slice(0, 8))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [apiKey, canUse, tokenInfo?.permissions])

  useEffect(() => {
    void load()
  }, [load])

  if (!canUse('orders')) {
    return <p className="empty-state">Add an API key with Trading Post permission to view your orders.</p>
  }

  const alerts = rows.filter((row) => row.status === 'undercut' || row.status === 'outbid')
  const freeSlots = Math.max(0, slotLimit - slotCount)

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>My orders</h2>
        <button type="button" className="secondary" disabled={loading} onClick={() => void load()}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <p className="hint">
        Order slots: <strong>{slotCount}</strong> / {slotLimit} used ({freeSlots} free)
      </p>

      {error ? <p className="error">{error}</p> : null}

      {alerts.length > 0 ? (
        <div className="alert-banner">
          {alerts.length} order{alerts.length === 1 ? '' : 's'} need attention — undercut or outbid on the market.
        </div>
      ) : null}

      {cancelAdvice.length > 0 ? (
        <section className="panel nested-panel order-optimizer">
          <h3>Slot optimizer</h3>
          <p className="hint">Orders to review first — stale prices locking capital or listing slots.</p>
          <ul className="delivery-list">
            {cancelAdvice.map((entry) => (
              <li key={`${entry.order.side}-${entry.order.id}`}>
                <button
                  type="button"
                  className="row-link"
                  onClick={() =>
                    openItem({ id: entry.order.item_id, name: entry.order.itemName })
                  }
                >
                  {entry.order.itemName}
                </button>
                <span className="hint">{entry.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {rows.length === 0 && !loading ? (
        <p className="empty-state">No open buy or sell orders on the trading post.</p>
      ) : (
        <div className="table-wrap table-sticky">
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-sticky-left">Item</th>
                <th>Side</th>
                <th>Your price</th>
                <th className="col-hide-mobile">Market</th>
                <th className="col-hide-mobile">Qty</th>
                <th className="col-sticky-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.side}-${row.id}`} className={`status-${row.status}`}>
                  <td className="item-cell">
                    <button
                      type="button"
                      className="row-link"
                      onClick={() => openItem({ id: row.itemId, name: row.itemName, icon: row.icon })}
                    >
                      {row.icon ? <img src={row.icon} alt="" width={28} height={28} /> : null}
                      <span>{row.itemName}</span>
                    </button>
                  </td>
                  <td>{row.side === 'buy' ? 'Buy' : 'Sell'}</td>
                  <td>{formatCoins(row.yourPrice)}</td>
                  <td className="col-hide-mobile">{row.marketPrice > 0 ? formatCoins(row.marketPrice) : '—'}</td>
                  <td className="col-hide-mobile">{row.quantity}</td>
                  <td className="col-sticky-right">
                    <span className={`status-pill ${row.status}`}>
                      {row.status === 'competitive'
                        ? 'Top price'
                        : row.status === 'undercut'
                          ? `Undercut by ${formatCoins(row.gap)}`
                          : row.status === 'outbid'
                            ? `Outbid by ${formatCoins(row.gap)}`
                            : 'No market data'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

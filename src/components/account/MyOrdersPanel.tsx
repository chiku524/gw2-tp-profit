import { useCallback, useEffect, useState } from 'react'
import { useApiKey } from '../../context/ApiKeyProvider'
import { formatCoins } from '../../lib/coins'
import { fetchCommercePrice, fetchCurrentOrders, fetchItems } from '../../lib/gw2Api'
import type { CommerceTransaction, OrderRow } from '../../types'

function orderStatus(
  side: 'buy' | 'sell',
  yourPrice: number,
  marketPrice: number,
): OrderRow['status'] {
  if (marketPrice <= 0) return 'unknown'
  if (side === 'sell') {
    if (yourPrice <= marketPrice) return 'competitive'
    return 'undercut'
  }
  if (yourPrice >= marketPrice) return 'competitive'
  return 'outbid'
}

async function enrichOrders(
  orders: CommerceTransaction[],
  side: 'buy' | 'sell',
): Promise<OrderRow[]> {
  if (orders.length === 0) return []

  const itemIds = [...new Set(orders.map((order) => order.item_id))]
  const [items, prices] = await Promise.all([
    fetchItems(itemIds),
    Promise.all(itemIds.map((id) => fetchCommercePrice(id).catch(() => null))),
  ])

  const itemMap = new Map(items.map((item) => [item.id, item]))
  const priceMap = new Map(prices.filter(Boolean).map((price) => [price!.id, price!]))

  return orders.map((order) => {
    const item = itemMap.get(order.item_id)
    const market = priceMap.get(order.item_id)
    const marketPrice =
      side === 'sell' ? (market?.sells.unit_price ?? 0) : (market?.buys.unit_price ?? 0)
    const status = orderStatus(side, order.price, marketPrice)
    const gap = side === 'sell' ? order.price - marketPrice : marketPrice - order.price

    return {
      id: order.id,
      itemId: order.item_id,
      itemName: item?.name ?? `Item ${order.item_id}`,
      icon: item?.icon,
      side,
      yourPrice: order.price,
      marketPrice,
      quantity: order.quantity,
      created: order.created,
      status,
      gap: Math.max(0, gap),
    }
  })
}

export function MyOrdersPanel() {
  const { apiKey, canUse } = useApiKey()
  const [rows, setRows] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!apiKey || !canUse('orders')) return
    setLoading(true)
    setError(null)

    try {
      const [buys, sells] = await Promise.all([
        fetchCurrentOrders(apiKey, 'buys'),
        fetchCurrentOrders(apiKey, 'sells'),
      ])
      const enriched = [
        ...(await enrichOrders(buys, 'buy')),
        ...(await enrichOrders(sells, 'sell')),
      ]
      enriched.sort((a, b) => {
        const rank = { undercut: 0, outbid: 0, unknown: 1, competitive: 2 }
        return rank[a.status] - rank[b.status] || b.gap - a.gap
      })
      setRows(enriched)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [apiKey, canUse])

  useEffect(() => {
    void load()
  }, [load])

  if (!canUse('orders')) {
    return <p className="empty-state">Add an API key with Trading Post permission to view your orders.</p>
  }

  const alerts = rows.filter((row) => row.status === 'undercut' || row.status === 'outbid')

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>My orders</h2>
        <button type="button" className="secondary" disabled={loading} onClick={() => void load()}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {alerts.length > 0 ? (
        <div className="alert-banner">
          {alerts.length} order{alerts.length === 1 ? '' : 's'} need attention — undercut or outbid on the market.
        </div>
      ) : null}

      {rows.length === 0 && !loading ? (
        <p className="empty-state">No open buy or sell orders on the trading post.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Side</th>
                <th>Your price</th>
                <th>Market</th>
                <th>Qty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.side}-${row.id}`} className={`status-${row.status}`}>
                  <td className="item-cell">
                    {row.icon ? <img src={row.icon} alt="" width={28} height={28} /> : null}
                    <span>{row.itemName}</span>
                  </td>
                  <td>{row.side === 'buy' ? 'Buy' : 'Sell'}</td>
                  <td>{formatCoins(row.yourPrice)}</td>
                  <td>{row.marketPrice > 0 ? formatCoins(row.marketPrice) : '—'}</td>
                  <td>{row.quantity}</td>
                  <td>
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

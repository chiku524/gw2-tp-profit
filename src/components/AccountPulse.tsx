import { useEffect, useState } from 'react'
import { useApiKey } from '../context/ApiKeyProvider'
import { formatCoins } from '../lib/coins'
import { fetchCommercePrices, fetchCurrentOrders, fetchDelivery } from '../lib/gw2Api'

type Props = {
  onGoAccount: () => void
}

export function AccountPulse({ onGoAccount }: Props) {
  const { apiKey, canUse, isConnected } = useApiKey()
  const [deliveryCoins, setDeliveryCoins] = useState(0)
  const [deliveryItems, setDeliveryItems] = useState(0)
  const [orderAlerts, setOrderAlerts] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!apiKey || !isConnected || !canUse('delivery')) return

    const load = async () => {
      setLoading(true)
      try {
        const [delivery, buys, sells] = await Promise.all([
          fetchDelivery(apiKey),
          fetchCurrentOrders(apiKey, 'buys'),
          fetchCurrentOrders(apiKey, 'sells'),
        ])
        setDeliveryCoins(delivery.coins)
        setDeliveryItems(delivery.items.reduce((sum, row) => sum + row.count, 0))

        const orders = [
          ...buys.map((order) => ({ ...order, side: 'buy' as const })),
          ...sells.map((order) => ({ ...order, side: 'sell' as const })),
        ]
        const ids = [...new Set(orders.map((order) => order.item_id))]
        const prices = ids.length > 0 ? await fetchCommercePrices(ids) : []
        const priceMap = new Map(prices.map((price) => [price.id, price]))

        let alerts = 0
        for (const order of orders) {
          const market = priceMap.get(order.item_id)
          if (!market) continue
          if (order.side === 'sell' && order.price > market.sells.unit_price) alerts += 1
          if (order.side === 'buy' && order.price < market.buys.unit_price) alerts += 1
        }
        setOrderAlerts(alerts)
      } catch {
        /* optional widget */
      } finally {
        setLoading(false)
      }
    }

    void load()
    const timer = window.setInterval(() => void load(), 120_000)
    return () => window.clearInterval(timer)
  }, [apiKey, canUse, isConnected])

  if (!isConnected || !canUse('delivery')) return null

  return (
    <section className="panel account-pulse">
      <div className="panel-header">
        <h3>Your trading post</h3>
        <button type="button" className="secondary" onClick={onGoAccount}>
          Open account
        </button>
      </div>
      <div className="stat-grid">
        <button type="button" className="pulse-stat" onClick={onGoAccount}>
          <span>Delivery box</span>
          <strong className={deliveryCoins > 0 ? 'profit' : ''}>{formatCoins(deliveryCoins)}</strong>
          <small>{deliveryItems} items waiting</small>
        </button>
        <button type="button" className="pulse-stat" onClick={onGoAccount}>
          <span>Order alerts</span>
          <strong className={orderAlerts > 0 ? 'loss' : ''}>{orderAlerts}</strong>
          <small>{loading ? 'Updating…' : 'undercut or outbid'}</small>
        </button>
      </div>
    </section>
  )
}

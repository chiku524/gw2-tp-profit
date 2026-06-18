import { useCallback, useEffect, useState } from 'react'
import { useApiKey } from '../../context/ApiKeyProvider'
import { formatCoins } from '../../lib/coins'
import { fetchDelivery, fetchItems } from '../../lib/gw2Api'

export function DeliveryPanel() {
  const { apiKey, canUse } = useApiKey()
  const [coins, setCoins] = useState(0)
  const [items, setItems] = useState<{ id: number; name: string; icon?: string; count: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!apiKey || !canUse('delivery')) return
    setLoading(true)
    setError(null)

    try {
      const delivery = await fetchDelivery(apiKey)
      setCoins(delivery.coins)

      if (delivery.items.length === 0) {
        setItems([])
        return
      }

      const details = await fetchItems(delivery.items.map((entry) => entry.id))
      const detailMap = new Map(details.map((item) => [item.id, item]))
      setItems(
        delivery.items.map((entry) => ({
          id: entry.id,
          count: entry.count,
          name: detailMap.get(entry.id)?.name ?? `Item ${entry.id}`,
          icon: detailMap.get(entry.id)?.icon,
        })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load delivery box')
    } finally {
      setLoading(false)
    }
  }, [apiKey, canUse])

  useEffect(() => {
    void load()
  }, [load])

  if (!canUse('delivery')) {
    return <p className="empty-state">Add an API key with Trading Post permission to view your delivery box.</p>
  }

  const hasContents = coins > 0 || items.length > 0

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Delivery box</h2>
        <button type="button" className="secondary" disabled={loading} onClick={() => void load()}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {!hasContents && !loading ? (
        <p className="empty-state">Nothing to collect — delivery box is empty.</p>
      ) : (
        <div className="delivery-grid">
          <div className="delivery-card">
            <span>Coins waiting</span>
            <strong className={coins > 0 ? 'profit' : ''}>{formatCoins(coins)}</strong>
          </div>
          <div className="delivery-items">
            <h3>Items ({items.length})</h3>
            {items.length === 0 ? (
              <p className="hint">No items to collect.</p>
            ) : (
              <ul className="delivery-list">
                {items.map((item) => (
                  <li key={item.id}>
                    {item.icon ? <img src={item.icon} alt="" width={28} height={28} /> : null}
                    <span>{item.name}</span>
                    <strong>×{item.count}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

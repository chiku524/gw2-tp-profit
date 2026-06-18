import { useEffect, useState } from 'react'
import { useItemDetail } from '../context/ItemDetailProvider'
import { fetchCommercePrices, fetchItems } from '../lib/gw2Api'
import { loadRecentItemIds } from '../lib/marketStorage'
import { formatCoins } from '../lib/coins'
import { instantFlipProfit } from '../lib/profit'

export function RecentItemsPanel() {
  const { openItem } = useItemDetail()
  const [rows, setRows] = useState<{ id: number; name: string; icon?: string; profit: number }[]>([])

  useEffect(() => {
    const ids = loadRecentItemIds()
    if (ids.length === 0) return

    void (async () => {
      const [items, prices] = await Promise.all([fetchItems(ids), fetchCommercePrices(ids)])
      const priceMap = new Map(prices.map((price) => [price.id, price]))
      setRows(
        ids
          .map((id) => {
            const item = items.find((row) => row.id === id)
            const price = priceMap.get(id)
            const buy = price?.sells.unit_price ?? 0
            const sell = price?.buys.unit_price ?? 0
            return {
              id,
              name: item?.name ?? `Item ${id}`,
              icon: item?.icon,
              profit: instantFlipProfit(buy, sell),
            }
          })
          .slice(0, 8),
      )
    })()
  }, [])

  if (rows.length === 0) return null

  return (
    <section className="panel">
      <h3>Recently viewed</h3>
      <ul className="snapshot-list">
        {rows.map((row) => (
          <li key={row.id}>
            <button type="button" onClick={() => openItem({ id: row.id, name: row.name, icon: row.icon })}>
              {row.icon ? <img src={row.icon} alt="" width={24} height={24} /> : null}
              <span>{row.name}</span>
              <strong className={row.profit > 0 ? 'profit' : 'loss'}>{formatCoins(row.profit)}</strong>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

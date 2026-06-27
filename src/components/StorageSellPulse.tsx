import { useEffect, useState } from 'react'
import { useApiKey } from '../context/ApiKeyProvider'
import { useItemDetail } from '../context/ItemDetailProvider'
import { fetchAccountRawData, findSellOpportunities } from '../lib/accountSnapshot'
import { formatCoins } from '../lib/coins'
import { fetchItems } from '../lib/gw2Api'

type Props = {
  onGoSell: () => void
}

export function StorageSellPulse({ onGoSell }: Props) {
  const { apiKey, tokenInfo, canUse, isConnected } = useApiKey()
  const { openItem } = useItemDetail()
  const [topItems, setTopItems] = useState<{ id: number; name: string; icon?: string; revenue: number }[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [itemCount, setItemCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!apiKey || !isConnected || !canUse('craftingBank')) return

    const load = async () => {
      setLoading(true)
      try {
        const permissions = new Set(tokenInfo?.permissions ?? [])
        const data = await fetchAccountRawData(apiKey, permissions)
        const ownedIds = [
          ...data.bank.map((row) => row.id),
          ...data.materials.map((row) => row.id),
          ...data.delivery.items.map((row) => row.id),
          ...data.characters.flatMap((character) =>
            character.bags.flatMap(
              (bag) => bag?.inventory.map((slot) => slot?.id).filter((id): id is number => Boolean(id)) ?? [],
            ),
          ),
        ]
        const uniqueIds = [...new Set(ownedIds)]
        const items = uniqueIds.length > 0 ? await fetchItems(uniqueIds) : []
        const itemNames = new Map(items.map((item) => [item.id, { name: item.name, icon: item.icon }]))
        const opportunities = await findSellOpportunities(data, itemNames)

        setItemCount(opportunities.length)
        setTotalRevenue(opportunities.reduce((sum, row) => sum + row.listRevenue, 0))
        setTopItems(
          opportunities.slice(0, 3).map((row) => ({
            id: row.itemId,
            name: row.name,
            icon: row.icon,
            revenue: row.listRevenue,
          })),
        )
      } catch {
        /* optional widget */
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [apiKey, canUse, isConnected, tokenInfo?.permissions])

  if (!isConnected || !canUse('craftingBank')) return null

  return (
    <section className="panel storage-sell-pulse">
      <div className="panel-header">
        <h3>Sell from storage</h3>
        <button type="button" className="secondary" onClick={onGoSell}>
          Open sell scanner
        </button>
      </div>
      <p className="hint">Items in your bank, materials, bags, and delivery that could be listed on the TP.</p>
      <div className="stat-grid">
        <button type="button" className="pulse-stat" onClick={onGoSell}>
          <span>Sell opportunities</span>
          <strong className={itemCount > 0 ? 'profit' : ''}>{loading ? '…' : itemCount}</strong>
          <small>{loading ? 'Scanning…' : 'items with TP value'}</small>
        </button>
        <button type="button" className="pulse-stat" onClick={onGoSell}>
          <span>Potential revenue</span>
          <strong className={totalRevenue > 0 ? 'profit' : ''}>
            {loading ? '…' : formatCoins(totalRevenue)}
          </strong>
          <small>if listed now (est.)</small>
        </button>
      </div>
      {topItems.length > 0 ? (
        <ul className="snapshot-list compact">
          {topItems.map((row) => (
            <li key={row.id}>
              <button type="button" onClick={() => openItem({ id: row.id, name: row.name, icon: row.icon })}>
                {row.icon ? <img src={row.icon} alt="" width={24} height={24} /> : null}
                <span>{row.name}</span>
                <strong className="profit">{formatCoins(row.revenue)}</strong>
              </button>
            </li>
          ))}
        </ul>
      ) : !loading ? (
        <p className="hint">No sellable items found in exposed storage.</p>
      ) : null}
    </section>
  )
}

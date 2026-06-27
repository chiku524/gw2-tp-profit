import { useCallback, useEffect, useState } from 'react'
import { useApiKey } from '../../context/ApiKeyProvider'
import { useItemDetail } from '../../context/ItemDetailProvider'
import { fetchAccountRawData, findSellOpportunities } from '../../lib/accountSnapshot'
import { fetchItems } from '../../lib/gw2Api'
import { formatCoins } from '../../lib/coins'
import type { StorageSellOpportunity } from '../../types'

export function SellFromStoragePanel() {
  const { apiKey, tokenInfo, canUse } = useApiKey()
  const { openItem } = useItemDetail()
  const [rows, setRows] = useState<StorageSellOpportunity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!apiKey || !canUse('craftingBank')) return
    setLoading(true)
    setError(null)
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
      setRows(opportunities.slice(0, 80))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan storage')
    } finally {
      setLoading(false)
    }
  }, [apiKey, canUse, tokenInfo?.permissions])

  useEffect(() => {
    void load()
  }, [load])

  if (!canUse('craftingBank')) {
    return (
      <p className="empty-state">
        Add Inventories + Characters permissions to scan bank, materials, bags, and delivery for sell opportunities.
      </p>
    )
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Sell from storage</h2>
        <button type="button" className="secondary" disabled={loading} onClick={() => void load()}>
          {loading ? 'Scanning…' : 'Refresh'}
        </button>
      </div>
      <p className="hint">
        Items you own that have TP value — ranked by estimated revenue if you list or instant-sell now.
      </p>
      {error ? <p className="error">{error}</p> : null}

      {rows.length === 0 && !loading ? (
        <p className="empty-state">No sellable items found in exposed storage.</p>
      ) : (
        <div className="table-wrap table-sticky">
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-sticky-left">Item</th>
                <th>Qty</th>
                <th className="col-hide-mobile">Location</th>
                <th className="col-sticky-right">List revenue</th>
                <th className="col-hide-mobile">Instant sell</th>
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
                      <span>{row.name}</span>
                    </button>
                  </td>
                  <td>{row.quantity}</td>
                  <td className="hint-cell col-hide-mobile">{row.sources}</td>
                  <td className="profit col-sticky-right">{formatCoins(row.listRevenue)}</td>
                  <td className="col-hide-mobile">{formatCoins(row.instantRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

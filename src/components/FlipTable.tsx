import { useMemo, useState } from 'react'
import { useItemDetail } from '../context/ItemDetailProvider'
import { useWatchlist } from '../context/WatchlistProvider'
import { formatCoins } from '../lib/coins'
import type { FlipOpportunity, FlipSortKey } from '../types'

type Props = {
  rows: FlipOpportunity[]
}

type SortDir = 'asc' | 'desc'

function sortRows(rows: FlipOpportunity[], key: FlipSortKey, dir: SortDir): FlipOpportunity[] {
  const sorted = [...rows].sort((a, b) => {
    switch (key) {
      case 'name':
        return a.itemName.localeCompare(b.itemName)
      case 'buy':
        return a.buyPrice - b.buyPrice
      case 'sell':
        return a.sellPrice - b.sellPrice
      case 'roi':
        return a.instantRoi - b.instantRoi
      case 'spread':
        return (a.spreadPct ?? 0) - (b.spreadPct ?? 0)
      case 'volume':
        return Math.min(a.buyVolume, a.sellVolume) - Math.min(b.buyVolume, b.sellVolume)
      case 'profit':
      default:
        return a.instantProfit - b.instantProfit
    }
  })
  return dir === 'desc' ? sorted.reverse() : sorted
}

export function FlipTable({ rows }: Props) {
  const { openItem } = useItemDetail()
  const { isWatched, toggle } = useWatchlist()
  const [sortKey, setSortKey] = useState<FlipSortKey>('profit')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filter, setFilter] = useState('')

  const displayed = useMemo(() => {
    const filtered = filter.trim()
      ? rows.filter((row) => row.itemName.toLowerCase().includes(filter.trim().toLowerCase()))
      : rows
    return sortRows(filtered, sortKey, sortDir)
  }, [rows, sortKey, sortDir, filter])

  const toggleSort = (key: FlipSortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'desc' ? 'asc' : 'desc'))
      return
    }
    setSortKey(key)
    setSortDir('desc')
  }

  const sortLabel = (key: FlipSortKey, label: string) => (
    <button type="button" className={`sort-btn ${sortKey === key ? 'active' : ''}`} onClick={() => toggleSort(key)}>
      {label} {sortKey === key ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </button>
  )

  if (rows.length === 0) {
    return <p className="empty-state">No flip opportunities match your filters yet. Run a scan to search the trading post.</p>
  }

  return (
    <div className="flip-table-tools">
      <input
        type="search"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter results…"
        aria-label="Filter scan results"
      />
      <span className="hint">{displayed.length} of {rows.length} shown</span>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>{sortLabel('name', 'Item')}</th>
              <th>{sortLabel('buy', 'Buy')}</th>
              <th>{sortLabel('sell', 'Sell')}</th>
              <th>{sortLabel('profit', 'Profit')}</th>
              <th>{sortLabel('roi', 'ROI')}</th>
              <th>{sortLabel('spread', 'Spread')}</th>
              <th>{sortLabel('volume', 'Volume')}</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((row) => (
              <tr key={row.itemId} className="clickable-row">
                <td>
                  <button
                    type="button"
                    className={`icon-btn ${isWatched(row.itemId) ? 'active' : ''}`}
                    onClick={() =>
                      toggle({ itemId: row.itemId, name: row.itemName, icon: row.icon })
                    }
                  >
                    {isWatched(row.itemId) ? '★' : '☆'}
                  </button>
                </td>
                <td className="item-cell">
                  <button
                    type="button"
                    className="row-link"
                    onClick={() => openItem({ id: row.itemId, name: row.itemName, icon: row.icon })}
                  >
                    {row.icon ? <img src={row.icon} alt="" width={32} height={32} /> : null}
                    <span>{row.itemName}</span>
                    {!row.whitelisted ? <span className="badge">HoT/PoF</span> : null}
                  </button>
                </td>
                <td>{formatCoins(row.buyPrice)}</td>
                <td>{formatCoins(row.sellPrice)}</td>
                <td className="profit">{formatCoins(row.instantProfit)}</td>
                <td>{row.instantRoi.toFixed(1)}%</td>
                <td>{(row.spreadPct ?? 0).toFixed(1)}%</td>
                <td>{row.buyVolume} / {row.sellVolume}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

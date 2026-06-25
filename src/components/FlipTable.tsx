import { useMemo, useState } from 'react'
import { useItemDetail } from '../context/ItemDetailProvider'
import { useWatchlist } from '../context/WatchlistProvider'
import { filterRowsByScanFilters } from '../lib/scanFilters'
import { disciplineLabel } from '../lib/disciplines'
import { categoryLabel } from '../lib/itemCategories'
import { useNamedFlips } from '../hooks/useNamedFlips'
import { RiskFlagBadges } from './RiskFlagBadges'
import { formatCoins } from '../lib/coins'
import type { FlipOpportunity, FlipSortKey, ScanFilters } from '../types'

type Props = {
  rows: FlipOpportunity[]
  scanFilters?: ScanFilters
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
        return a.listingRoi - b.listingRoi
      case 'spread':
        return (a.spreadPct ?? 0) - (b.spreadPct ?? 0)
      case 'volume':
        return Math.min(a.buyVolume, a.sellVolume) - Math.min(b.buyVolume, b.sellVolume)
      case 'liquidity':
        return (a.liquidityScore ?? 0) - (b.liquidityScore ?? 0)
      case 'profit':
      default:
        return a.listingProfit - b.listingProfit
    }
  })
  return dir === 'desc' ? sorted.reverse() : sorted
}

export function FlipTable({ rows, scanFilters }: Props) {
  const { openItem } = useItemDetail()
  const { isWatched, toggle } = useWatchlist()
  const namedRows = useNamedFlips(rows)
  const filteredRows = scanFilters ? filterRowsByScanFilters(namedRows, scanFilters) : namedRows
  const [sortKey, setSortKey] = useState<FlipSortKey>('profit')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filter, setFilter] = useState('')

  const displayed = useMemo(() => {
    const filtered = filter.trim()
      ? filteredRows.filter((row) => row.itemName.toLowerCase().includes(filter.trim().toLowerCase()))
      : filteredRows
    return sortRows(filtered, sortKey, sortDir)
  }, [filteredRows, sortKey, sortDir, filter])

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
    return <p className="empty-state">No listing-flip opportunities match your filters. Try the High volume preset or lower min profit, then run a scan.</p>
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
      <span className="hint">{displayed.length} of {filteredRows.length} shown</span>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>{sortLabel('name', 'Item')}</th>
              <th>Category</th>
              <th>Disciplines</th>
              <th>{sortLabel('buy', 'Lowest sell')}</th>
              <th>{sortLabel('sell', 'Highest buy')}</th>
              <th>{sortLabel('profit', 'List profit')}</th>
              <th>{sortLabel('roi', 'ROI')}</th>
              <th>{sortLabel('spread', 'Gap')}</th>
              <th>{sortLabel('liquidity', 'Liquidity')}</th>
              <th>Risks</th>
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
                <td>
                  <span className="badge subtle">
                    {row.itemCategory ? categoryLabel(row.itemCategory) : '—'}
                  </span>
                </td>
                <td>
                  {row.itemDisciplines?.length ? (
                    <span className="tag-list">
                      {row.itemDisciplines.map((discipline) => (
                        <span key={discipline} className="badge subtle">
                          {disciplineLabel(discipline)}
                        </span>
                      ))}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{formatCoins(row.buyPrice)}</td>
                <td>{formatCoins(row.sellPrice)}</td>
                <td className={row.listingProfit > 0 ? 'profit' : 'loss'}>{formatCoins(row.listingProfit)}</td>
                <td>{row.listingRoi.toFixed(1)}%</td>
                <td>{(row.spreadPct ?? 0).toFixed(1)}%</td>
                <td>{row.liquidityScore ?? 0}</td>
                <td>
                  <RiskFlagBadges flags={row.riskFlags} />
                </td>
                <td>{row.buyVolume} / {row.sellVolume}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

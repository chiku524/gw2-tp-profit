import { useMemo, useState } from 'react'
import { useItemDetail } from '../context/ItemDetailProvider'
import { formatCoins } from '../lib/coins'
import { formatProfitMoveInputs, kindLabel } from '../lib/profitMoves'
import { disciplineLabel } from '../lib/disciplines'
import type { ProfitMove, ProfitMoveKind } from '../types'

type SortKey = 'profit' | 'roi' | 'cost' | 'name' | 'kind'
type SortDir = 'asc' | 'desc'

type Props = {
  rows: ProfitMove[]
  kindFilter?: ProfitMoveKind[]
  compact?: boolean
  onPlanBulk?: (move: ProfitMove) => void
}

function sortRows(rows: ProfitMove[], key: SortKey, dir: SortDir): ProfitMove[] {
  const sorted = [...rows].sort((a, b) => {
    switch (key) {
      case 'name':
        return a.outputItemName.localeCompare(b.outputItemName)
      case 'cost':
        return a.inputCost - b.inputCost
      case 'roi':
        return a.listingRoi - b.listingRoi
      case 'kind':
        return a.kind.localeCompare(b.kind)
      case 'profit':
      default:
        return a.listingProfit - b.listingProfit
    }
  })
  return dir === 'desc' ? sorted.reverse() : sorted
}

export function ProfitMovesTable({ rows, kindFilter = [], compact = false, onPlanBulk }: Props) {
  const { openItem } = useItemDetail()
  const [sortKey, setSortKey] = useState<SortKey>('profit')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filter, setFilter] = useState('')

  const displayed = useMemo(() => {
    const kindRows = kindFilter.length
      ? rows.filter((row) => kindFilter.includes(row.kind))
      : rows
    const filtered = filter.trim()
      ? kindRows.filter((row) => {
          const haystack = `${row.outputItemName} ${formatProfitMoveInputs(row)}`.toLowerCase()
          return haystack.includes(filter.trim().toLowerCase())
        })
      : kindRows
    return sortRows(filtered, sortKey, sortDir)
  }, [rows, kindFilter, sortKey, sortDir, filter])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'desc' ? 'asc' : 'desc'))
      return
    }
    setSortKey(key)
    setSortDir('desc')
  }

  const sortLabel = (key: SortKey, label: string) => (
    <button type="button" className={`sort-btn ${sortKey === key ? 'active' : ''}`} onClick={() => toggleSort(key)}>
      {label} {sortKey === key ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </button>
  )

  if (rows.length === 0) {
    return (
      <p className="empty-state">
        No profitable refinements or crafts match your filters. Run a scan or lower min profit / ROI.
      </p>
    )
  }

  return (
    <div className="flip-table-tools profit-moves-table">
      {!compact ? (
        <input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter by output or ingredients…"
          aria-label="Filter profit moves"
        />
      ) : null}
      {!compact ? <span className="hint">{displayed.length} of {rows.length} shown</span> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{sortLabel('kind', 'Type')}</th>
              <th>Combine</th>
              <th>{sortLabel('name', 'Output')}</th>
              {!compact ? <th>Disciplines</th> : null}
              {!compact ? <th>{sortLabel('cost', 'Input cost')}</th> : null}
              <th>{sortLabel('profit', 'Profit / craft')}</th>
              {!compact ? <th>{sortLabel('roi', 'ROI')}</th> : null}
              {!compact ? <th>×25 profit</th> : null}
              {!compact ? <th>×100 profit</th> : null}
              {!compact && onPlanBulk ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {displayed.map((row) => (
              <tr key={row.recipeId} className="clickable-row">
                <td>
                  <span className={`badge subtle kind-${row.kind}`}>{kindLabel(row.kind)}</span>
                </td>
                <td className="combine-cell">
                  <span className="combine-formula">
                    {row.inputs.map((input, index) => (
                      <span key={input.itemId}>
                        {index > 0 ? <span className="combine-plus"> + </span> : null}
                        <button
                          type="button"
                          className="inline-item-link"
                          onClick={() => openItem({ id: input.itemId, name: input.name })}
                        >
                          {input.count}× {input.name}
                        </button>
                      </span>
                    ))}
                    <span className="combine-arrow"> → </span>
                    <button
                      type="button"
                      className="inline-item-link"
                      onClick={() =>
                        openItem({ id: row.outputItemId, name: row.outputItemName, icon: row.outputIcon })
                      }
                    >
                      {row.outputCount > 1 ? `${row.outputCount}× ` : ''}
                      {row.outputItemName}
                    </button>
                  </span>
                </td>
                <td className="item-cell">
                  <button
                    type="button"
                    className="row-link"
                    onClick={() =>
                      openItem({ id: row.outputItemId, name: row.outputItemName, icon: row.outputIcon })
                    }
                  >
                    {row.outputIcon ? <img src={row.outputIcon} alt="" width={32} height={32} /> : null}
                    <span>{row.outputItemName}</span>
                  </button>
                </td>
                {!compact ? (
                  <td>
                    {row.disciplines.length ? (
                      <span className="tag-list">
                        {row.disciplines.map((discipline) => (
                          <span key={discipline} className="badge subtle">
                            {disciplineLabel(discipline)}
                          </span>
                        ))}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                ) : null}
                {!compact ? <td>{formatCoins(row.inputCost)}</td> : null}
                <td className={row.listingProfit > 0 ? 'profit' : 'loss'}>{formatCoins(row.listingProfit)}</td>
                {!compact ? <td>{row.listingRoi.toFixed(1)}%</td> : null}
                {!compact ? <td className="profit">{formatCoins(row.listingProfit * 25)}</td> : null}
                {!compact ? <td className="profit">{formatCoins(row.listingProfit * 100)}</td> : null}
                {!compact && onPlanBulk ? (
                  <td>
                    <button type="button" className="secondary compact-btn" onClick={() => onPlanBulk(row)}>
                      Plan bulk
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

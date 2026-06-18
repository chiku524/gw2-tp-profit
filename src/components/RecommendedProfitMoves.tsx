import { useEffect, useState } from 'react'
import { useItemDetail } from '../context/ItemDetailProvider'
import { formatCoins } from '../lib/coins'
import { formatProfitMoveInputs, kindLabel } from '../lib/profitMoves'
import { loadProfitMovesCache } from '../lib/preferences'
import type { ProfitMove } from '../types'

type Props = {
  onViewAll: () => void
  onScanCrafts?: () => void
}

const TOP_N = 5

export function RecommendedProfitMoves({ onViewAll, onScanCrafts }: Props) {
  const { openItem } = useItemDetail()
  const [moves, setMoves] = useState<ProfitMove[]>(() => loadProfitMovesCache()?.moves ?? [])

  useEffect(() => {
    const cached = loadProfitMovesCache()
    if (cached?.moves.length) setMoves(cached.moves)
  }, [])

  const top = moves.slice(0, TOP_N)

  if (top.length === 0) {
    return (
      <section className="panel recommended-moves">
        <h3>Recommended profit moves</h3>
        <p className="hint">
          Find profitable refinements (e.g. 2× ore → ingot) and simple crafts by scanning combine recipes on the
          Crafts tab.
        </p>
        <button type="button" className="secondary" onClick={onScanCrafts ?? onViewAll}>
          Scan refinements &amp; crafts
        </button>
      </section>
    )
  }

  return (
    <section className="panel recommended-moves">
      <div className="panel-header-inline">
        <h3>Recommended profit moves</h3>
        <button type="button" className="link-button" onClick={onViewAll}>
          View all crafts
        </button>
      </div>
      <p className="hint">
        Profitable refinements &amp; combines from your last craft scan — buy inputs, craft, list output on the TP.
      </p>
      <ul className="snapshot-list profit-moves-list">
        {top.map((row) => (
          <li key={row.recipeId}>
            <button
              type="button"
              onClick={() =>
                openItem({ id: row.outputItemId, name: row.outputItemName, icon: row.outputIcon })
              }
            >
              {row.outputIcon ? <img src={row.outputIcon} alt="" width={24} height={24} /> : null}
              <span className="move-summary">
                <span className={`badge subtle kind-${row.kind}`}>{kindLabel(row.kind)}</span>
                <span className="move-formula">
                  {formatProfitMoveInputs(row)} → {row.outputCount > 1 ? `${row.outputCount}× ` : ''}
                  {row.outputItemName}
                </span>
              </span>
              <strong className="profit">{formatCoins(row.listingProfit)}</strong>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

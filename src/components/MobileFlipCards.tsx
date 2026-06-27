import { formatCoins } from '../lib/coins'
import { profitTrend, trendLabel, trendTitle } from '../lib/priceTrend'
import type { FlipOpportunity } from '../types'

type Props = {
  rows: FlipOpportunity[]
  isWatched: (itemId: number) => boolean
  onToggleWatch: (row: FlipOpportunity) => void
  onOpenItem: (row: FlipOpportunity) => void
}

export function MobileFlipCards({ rows, isWatched, onToggleWatch, onOpenItem }: Props) {
  return (
    <ul className="mobile-card-list" aria-label="Flip opportunities">
      {rows.map((row) => {
        const trend = profitTrend(row.itemId)
        return (
          <li key={row.itemId} className="mobile-card">
            <div className="mobile-card-header">
              <button type="button" className="mobile-card-main" onClick={() => onOpenItem(row)}>
                {row.icon ? <img src={row.icon} alt="" width={36} height={36} /> : null}
                <span className="mobile-card-title">{row.itemName}</span>
              </button>
              <button
                type="button"
                className={`icon-btn ${isWatched(row.itemId) ? 'active' : ''}`}
                onClick={() => onToggleWatch(row)}
                aria-label={isWatched(row.itemId) ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                {isWatched(row.itemId) ? '★' : '☆'}
              </button>
            </div>
            <div className="mobile-card-profit">
              <span className="mobile-card-profit-label">List profit</span>
              <strong className={row.listingProfit > 0 ? 'profit' : 'loss'}>
                {formatCoins(row.listingProfit)}
              </strong>
              <span className="mobile-card-roi">{row.listingRoi.toFixed(1)}% ROI</span>
              {trend ? (
                <span className={`price-trend price-trend-${trend}`} title={trendTitle(trend)}>
                  {trendLabel(trend)}
                </span>
              ) : null}
            </div>
            <dl className="mobile-card-stats">
              <div>
                <dt>Lowest sell</dt>
                <dd>{formatCoins(row.buyPrice)}</dd>
              </div>
              <div>
                <dt>Highest buy</dt>
                <dd>{formatCoins(row.sellPrice)}</dd>
              </div>
              <div>
                <dt>Gap</dt>
                <dd>{(row.spreadPct ?? 0).toFixed(1)}%</dd>
              </div>
              <div>
                <dt>Volume</dt>
                <dd>
                  {row.buyVolume} / {row.sellVolume}
                </dd>
              </div>
            </dl>
          </li>
        )
      })}
    </ul>
  )
}

import { formatCoins } from '../lib/coins'
import { profitTrend, trendLabel, trendTitle } from '../lib/priceTrend'
import type { WatchlistSnapshot } from '../types'

type Props = {
  rows: WatchlistSnapshot[]
  onOpenItem: (row: WatchlistSnapshot) => void
  onRemove: (itemId: number) => void
}

export function MobileWatchlistCards({ rows, onOpenItem, onRemove }: Props) {
  return (
    <ul className="mobile-card-list" aria-label="Watchlist">
      {rows.map((row) => {
        const trend = profitTrend(row.itemId)
        return (
          <li key={row.itemId} className="mobile-card">
            <div className="mobile-card-header">
              <button type="button" className="mobile-card-main" onClick={() => onOpenItem(row)}>
                {row.icon ? <img src={row.icon} alt="" width={36} height={36} /> : null}
                <span className="mobile-card-title">{row.name}</span>
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => onRemove(row.itemId)}
                aria-label="Remove from watchlist"
              >
                ✕
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
                <dt>Buy</dt>
                <dd>{formatCoins(row.buyPrice)}</dd>
              </div>
              <div>
                <dt>Sell</dt>
                <dd>{formatCoins(row.sellPrice)}</dd>
              </div>
            </dl>
          </li>
        )
      })}
    </ul>
  )
}

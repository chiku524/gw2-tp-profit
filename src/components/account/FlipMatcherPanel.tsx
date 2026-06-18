import { useMemo } from 'react'
import { formatCoins } from '../../lib/coins'
import type { MatchedFlip, FlipMatcherSummary } from '../../lib/flipMatcher'

type Props = {
  flips: MatchedFlip[]
  summary: FlipMatcherSummary
  loading?: boolean
}

export function FlipMatcherPanel({ flips, summary, loading }: Props) {
  const topItems = useMemo(() => {
    const byItem = new Map<number, { name: string; profit: number; qty: number }>()
    for (const flip of flips) {
      const current = byItem.get(flip.itemId) ?? { name: flip.itemName, profit: 0, qty: 0 }
      current.profit += flip.profit
      current.qty += flip.quantity
      byItem.set(flip.itemId, current)
    }
    return [...byItem.values()].sort((a, b) => b.profit - a.profit).slice(0, 8)
  }, [flips])

  return (
    <section className="panel nested-panel">
      <h3>FIFO flip matcher</h3>
      <p className="hint">
        Pairs fulfilled buy and sell orders per item in chronological order for a closer estimate of
        per-flip profit than gross buy/sell totals.
      </p>

      {loading ? <p className="status">Matching transactions…</p> : null}

      <div className="stat-grid summary-grid">
        <div>
          <span>Matched flips</span>
          <strong>{summary.matchedFlips}</strong>
          <small>{summary.matchedQuantity.toLocaleString()} items</small>
        </div>
        <div>
          <span>FIFO net profit</span>
          <strong className={summary.totalProfit >= 0 ? 'profit' : 'loss'}>
            {formatCoins(summary.totalProfit)}
          </strong>
        </div>
        <div>
          <span>Unmatched buys</span>
          <strong>{summary.unmatchedBuys.toLocaleString()} qty</strong>
        </div>
        <div>
          <span>Unmatched sells</span>
          <strong>{summary.unmatchedSells.toLocaleString()} qty</strong>
        </div>
      </div>

      {topItems.length > 0 ? (
        <div className="top-items">
          <h4>Top matched items</h4>
          <ul className="delivery-list">
            {topItems.map((item) => (
              <li key={item.name}>
                <span>
                  {item.name} <small>({item.qty})</small>
                </span>
                <strong className={item.profit >= 0 ? 'profit' : 'loss'}>{formatCoins(item.profit)}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {flips.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sold</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Buy</th>
                <th>Sell</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {flips.slice(0, 80).map((flip, index) => (
                <tr key={`${flip.itemId}-${flip.soldAt}-${index}`}>
                  <td>{new Date(flip.soldAt).toLocaleDateString()}</td>
                  <td>{flip.itemName}</td>
                  <td>{flip.quantity}</td>
                  <td>{formatCoins(flip.buyPrice)}</td>
                  <td>{formatCoins(flip.sellPrice)}</td>
                  <td className={flip.profit >= 0 ? 'profit' : 'loss'}>{formatCoins(flip.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {flips.length > 80 ? <p className="hint">Showing latest 80 of {flips.length} matched flips.</p> : null}
        </div>
      ) : !loading ? (
        <p className="empty-state">No matched buy/sell pairs in the last 90 days.</p>
      ) : null}
    </section>
  )
}

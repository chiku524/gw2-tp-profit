import { formatCoins } from '../lib/coins'
import type { CommerceListings } from '../types'

type Props = {
  listings: CommerceListings
  compact?: boolean
}

export function OrderBook({ listings, compact }: Props) {
  const depth = compact ? 4 : 6
  const topBuys = listings.buys.slice(0, depth)
  const topSells = listings.sells.slice(0, depth)
  const maxQty = Math.max(
    1,
    ...topBuys.map((row) => row.quantity),
    ...topSells.map((row) => row.quantity),
  )

  return (
    <section className="order-book">
      <h3>Order book</h3>
      <div className="order-book-grid">
        <div>
          <h4>Buy orders</h4>
          <ul className="depth-list">
            {topBuys.length === 0 ? (
              <li className="hint">No buy orders</li>
            ) : (
              topBuys.map((row, index) => (
                <li key={`buy-${index}`}>
                  <span className="depth-bar buy" style={{ width: `${(row.quantity / maxQty) * 100}%` }} />
                  <span>{formatCoins(row.unit_price)}</span>
                  <strong>{row.quantity.toLocaleString()}</strong>
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <h4>Sell listings</h4>
          <ul className="depth-list">
            {topSells.length === 0 ? (
              <li className="hint">No sell listings</li>
            ) : (
              topSells.map((row, index) => (
                <li key={`sell-${index}`}>
                  <span className="depth-bar sell" style={{ width: `${(row.quantity / maxQty) * 100}%` }} />
                  <span>{formatCoins(row.unit_price)}</span>
                  <strong>{row.quantity.toLocaleString()}</strong>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  )
}

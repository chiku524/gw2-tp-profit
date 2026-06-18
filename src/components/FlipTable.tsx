import { formatCoins } from '../lib/coins'
import type { FlipOpportunity } from '../types'

type Props = {
  rows: FlipOpportunity[]
}

export function FlipTable({ rows }: Props) {
  if (rows.length === 0) {
    return <p className="empty-state">No flip opportunities match your filters yet. Run a scan to search the trading post.</p>
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Buy</th>
            <th>Sell</th>
            <th>Instant profit</th>
            <th>ROI</th>
            <th>Volume</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.itemId}>
              <td className="item-cell">
                {row.icon ? <img src={row.icon} alt="" width={32} height={32} /> : null}
                <span>{row.itemName}</span>
                {!row.whitelisted ? <span className="badge">HoT/PoF</span> : null}
              </td>
              <td>{formatCoins(row.buyPrice)}</td>
              <td>{formatCoins(row.sellPrice)}</td>
              <td className="profit">{formatCoins(row.instantProfit)}</td>
              <td>{row.instantRoi.toFixed(1)}%</td>
              <td>{row.buyVolume} / {row.sellVolume}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

import { formatCoins } from '../lib/coins'
import type { PriceSnapshot } from '../lib/priceHistory'

type Props = {
  history: PriceSnapshot[]
  height?: number
}

export function PriceHistoryChart({ history, height = 140 }: Props) {
  if (history.length < 2) {
    return (
      <p className="hint">
        Price history builds from local snapshots plus server tracking (~100 core items every 6h, your
        watchlist &amp; viewed items too).
      </p>
    )
  }

  const width = 480
  const padding = { top: 12, right: 8, bottom: 24, left: 8 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const minT = history[0].t
  const maxT = history[history.length - 1].t
  const prices = history.flatMap((row) => [row.buy, row.sell])
  const minP = Math.min(...prices)
  const maxP = Math.max(...prices)
  const range = Math.max(1, maxP - minP)

  const x = (t: number) => padding.left + ((t - minT) / Math.max(1, maxT - minT)) * innerW
  const y = (price: number) => padding.top + innerH - ((price - minP) / range) * innerH

  const buyPath = history.map((row, index) => `${index === 0 ? 'M' : 'L'} ${x(row.t)} ${y(row.buy)}`).join(' ')
  const sellPath = history.map((row, index) => `${index === 0 ? 'M' : 'L'} ${x(row.t)} ${y(row.sell)}`).join(' ')

  const last = history[history.length - 1]
  const spanDays = Math.max(1, Math.round((maxT - minT) / 86_400_000))

  return (
    <section className="price-chart">
      <div className="chart-legend">
        <span className="legend-buy">Lowest sell: {formatCoins(last.buy)}</span>
        <span className="legend-sell">Highest buy: {formatCoins(last.sell)}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Price history chart" preserveAspectRatio="none">
        <path d={buyPath} className="chart-line buy" fill="none" />
        <path d={sellPath} className="chart-line sell" fill="none" />
      </svg>
      <p className="hint">
        {history.length} snapshots · ~{spanDays}d span · oldest {new Date(minT).toLocaleDateString()}
      </p>
    </section>
  )
}

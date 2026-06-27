import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApiKey } from '../../context/ApiKeyProvider'
import { formatCoins } from '../../lib/coins'
import { matchFlips } from '../../lib/flipMatcher'
import { listingNetRevenue, LISTING_FEE_RATE } from '../../lib/profit'
import { fetchHistoryOrders, fetchItems } from '../../lib/gw2Api'
import type { CommerceTransaction, HistorySummary } from '../../types'
import { FlipMatcherPanel } from './FlipMatcherPanel'
import { FlipJournalPanel } from './FlipJournalPanel'

type HistoryRow = CommerceTransaction & {
  side: 'buy' | 'sell'
  itemName: string
  icon?: string
  total: number
  netTotal: number
}

function summarize(buys: CommerceTransaction[], sells: CommerceTransaction[]): HistorySummary {
  const buySpend = buys.reduce((sum, row) => sum + row.price * row.quantity, 0)
  const sellRevenueGross = sells.reduce((sum, row) => sum + row.price * row.quantity, 0)
  const listingFees = sells.reduce((sum, row) => sum + row.price * row.quantity * LISTING_FEE_RATE, 0)
  const sellRevenueNet = sells.reduce(
    (sum, row) => sum + listingNetRevenue(row.price) * row.quantity,
    0,
  )

  return {
    buySpend,
    sellRevenueGross,
    sellRevenueNet,
    listingFees,
    estimatedNet: sellRevenueNet - buySpend,
    buyCount: buys.length,
    sellCount: sells.length,
  }
}

export function HistoryPanel() {
  const { apiKey, canUse } = useApiKey()
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [summary, setSummary] = useState<HistorySummary | null>(null)
  const [rawBuys, setRawBuys] = useState<CommerceTransaction[]>([])
  const [rawSells, setRawSells] = useState<CommerceTransaction[]>([])
  const [itemNames, setItemNames] = useState<Map<number, string>>(new Map())
  const [view, setView] = useState<'summary' | 'matcher' | 'ledger' | 'journal'>('summary')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!apiKey || !canUse('history')) return
    setLoading(true)
    setError(null)

    try {
      const [buys, sells] = await Promise.all([
        fetchHistoryOrders(apiKey, 'buys'),
        fetchHistoryOrders(apiKey, 'sells'),
      ])

      setRawBuys(buys)
      setRawSells(sells)
      setSummary(summarize(buys, sells))

      const itemIds = [...new Set([...buys, ...sells].map((row) => row.item_id))]
      const items = await fetchItems(itemIds)
      const itemMap = new Map(items.map((item) => [item.id, item.name]))
      setItemNames(itemMap)

      const enriched: HistoryRow[] = [
        ...buys.map((row) => ({
          ...row,
          side: 'buy' as const,
          itemName: itemMap.get(row.item_id) ?? `Item ${row.item_id}`,
          icon: items.find((item) => item.id === row.item_id)?.icon,
          total: row.price * row.quantity,
          netTotal: -(row.price * row.quantity),
        })),
        ...sells.map((row) => ({
          ...row,
          side: 'sell' as const,
          itemName: itemMap.get(row.item_id) ?? `Item ${row.item_id}`,
          icon: items.find((item) => item.id === row.item_id)?.icon,
          total: row.price * row.quantity,
          netTotal: listingNetRevenue(row.price) * row.quantity,
        })),
      ]

      enriched.sort((a, b) => Date.parse(b.purchased ?? b.created) - Date.parse(a.purchased ?? a.created))
      setRows(enriched)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transaction history')
    } finally {
      setLoading(false)
    }
  }, [apiKey, canUse])

  useEffect(() => {
    void load()
  }, [load])

  const topItems = useMemo(() => {
    const byItem = new Map<number, { name: string; net: number }>()
    for (const row of rows) {
      const current = byItem.get(row.item_id) ?? { name: row.itemName, net: 0 }
      current.net += row.netTotal
      byItem.set(row.item_id, current)
    }
    return [...byItem.entries()]
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.net - a.net)
      .slice(0, 8)
  }, [rows])

  const matcher = useMemo(() => matchFlips(rawBuys, rawSells, itemNames), [rawBuys, rawSells, itemNames])

  if (!canUse('history')) {
    return (
      <p className="empty-state">Add an API key with Trading Post permission to view your 90-day history.</p>
    )
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Flip P&amp;L (90 days)</h2>
        <button type="button" className="secondary" disabled={loading} onClick={() => void load()}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <p className="hint">
        ArenaNet only exposes the last 90 days of fulfilled orders. Sell revenue includes the 5% listing fee and
        10% exchange fee; net figures reflect both.
      </p>

      {error ? <p className="error">{error}</p> : null}

      <nav className="subtabs" aria-label="History views">
        <button type="button" className={view === 'summary' ? 'active' : ''} onClick={() => setView('summary')}>
          Summary
        </button>
        <button type="button" className={view === 'matcher' ? 'active' : ''} onClick={() => setView('matcher')}>
          FIFO matcher
        </button>
        <button type="button" className={view === 'ledger' ? 'active' : ''} onClick={() => setView('ledger')}>
          Ledger
        </button>
        <button type="button" className={view === 'journal' ? 'active' : ''} onClick={() => setView('journal')}>
          Journal
        </button>
      </nav>

      {view === 'summary' && summary ? (
        <>
          <div className="stat-grid summary-grid">
            <div>
              <span>Buy spend</span>
              <strong className="loss">{formatCoins(summary.buySpend)}</strong>
              <small>{summary.buyCount} orders</small>
            </div>
            <div>
              <span>Sell revenue (gross)</span>
              <strong>{formatCoins(summary.sellRevenueGross)}</strong>
              <small>{summary.sellCount} orders</small>
            </div>
            <div>
              <span>Sell revenue (after fees)</span>
              <strong>{formatCoins(summary.sellRevenueNet)}</strong>
              <small>incl. 5% listing + 10% exchange</small>
            </div>
            <div>
              <span>Listing fees paid</span>
              <strong className="loss">{formatCoins(summary.listingFees)}</strong>
            </div>
            <div>
              <span>Estimated net</span>
              <strong className={summary.estimatedNet >= 0 ? 'profit' : 'loss'}>
                {formatCoins(summary.estimatedNet)}
              </strong>
            </div>
            <div>
              <span>FIFO matched profit</span>
              <strong className={matcher.summary.totalProfit >= 0 ? 'profit' : 'loss'}>
                {formatCoins(matcher.summary.totalProfit)}
              </strong>
              <small>{matcher.summary.matchedFlips} flips</small>
            </div>
          </div>

          {topItems.length > 0 ? (
            <div className="top-items">
              <h3>Top items by net flow</h3>
              <ul className="delivery-list">
                {topItems.map((item) => (
                  <li key={item.id}>
                    <span>{item.name}</span>
                    <strong className={item.net >= 0 ? 'profit' : 'loss'}>{formatCoins(item.net)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      {view === 'matcher' ? (
        <FlipMatcherPanel flips={matcher.flips} summary={matcher.summary} loading={loading} />
      ) : null}

      {view === 'journal' ? <FlipJournalPanel /> : null}

      {view === 'ledger' ? (
        rows.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Item</th>
                  <th>Side</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((row) => (
                  <tr key={`${row.side}-${row.id}`}>
                    <td>{new Date(row.purchased ?? row.created).toLocaleDateString()}</td>
                    <td className="item-cell">
                      {row.icon ? <img src={row.icon} alt="" width={24} height={24} /> : null}
                      <span>{row.itemName}</span>
                    </td>
                    <td>{row.side}</td>
                    <td>{formatCoins(row.price)}</td>
                    <td>{row.quantity}</td>
                    <td className={row.netTotal >= 0 ? 'profit' : 'loss'}>{formatCoins(row.netTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 100 ? <p className="hint">Showing latest 100 of {rows.length} transactions.</p> : null}
          </div>
        ) : !loading ? (
          <p className="empty-state">No fulfilled transactions in the last 90 days.</p>
        ) : null
      ) : null}
    </section>
  )
}

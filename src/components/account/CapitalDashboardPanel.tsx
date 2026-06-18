import { useCallback, useEffect, useState } from 'react'
import { useApiKey } from '../../context/ApiKeyProvider'
import { formatCoins } from '../../lib/coins'
import {
  buildCapitalSnapshot,
  fetchAccountRawData,
  type CapitalSnapshot,
} from '../../lib/accountSnapshot'
import { recordWealthProgress } from '../../lib/wealthGoals'
import { WealthGoalsPanel } from './WealthGoalsPanel'

export function CapitalDashboardPanel() {
  const { apiKey, tokenInfo, canUse } = useApiKey()
  const [capital, setCapital] = useState<CapitalSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!apiKey || !canUse('orders')) return
    setLoading(true)
    setError(null)
    try {
      const permissions = new Set(tokenInfo?.permissions ?? [])
      const data = await fetchAccountRawData(apiKey, permissions)
      const snapshot = buildCapitalSnapshot(data)
      setCapital(snapshot)
      recordWealthProgress(snapshot.totalLiquid, null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load capital')
    } finally {
      setLoading(false)
    }
  }, [apiKey, canUse, tokenInfo?.permissions])

  useEffect(() => {
    void load()
  }, [load])

  if (!canUse('orders')) {
    return <p className="empty-state">Connect an API key with Trading Post permission to view capital.</p>
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Capital dashboard</h2>
        <button type="button" className="secondary" disabled={loading} onClick={() => void load()}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
      <p className="hint">
        Track free gold vs capital deployed in orders. GW2 allows up to {capital?.orderSlotLimit ?? 250} open
        orders per account.
      </p>
      {error ? <p className="error">{error}</p> : null}

      {capital ? (
        <div className="stat-grid summary-grid">
          <div>
            <span>Free capital</span>
            <strong className="profit">{formatCoins(capital.freeCapital)}</strong>
            <small>wallet + delivery coins</small>
          </div>
          <div>
            <span>Locked in buys</span>
            <strong>{formatCoins(capital.lockedInBuyOrders)}</strong>
          </div>
          <div>
            <span>Sell listings (net)</span>
            <strong>{formatCoins(capital.sellListingsNet)}</strong>
          </div>
          <div>
            <span>Total liquid</span>
            <strong>{formatCoins(capital.totalLiquid)}</strong>
          </div>
          <div>
            <span>Order slots</span>
            <strong>
              {capital.orderSlotCount} / {capital.orderSlotLimit}
            </strong>
            <small>{capital.freeSlots} free</small>
          </div>
          <div>
            <span>Deployed in orders</span>
            <strong>{formatCoins(capital.totalDeployed)}</strong>
          </div>
        </div>
      ) : null}

      <WealthGoalsPanel capital={capital} />
    </section>
  )
}

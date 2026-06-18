import { useCallback, useEffect, useState } from 'react'
import { useApiKey } from '../../context/ApiKeyProvider'
import { calculateAccountValue, type AccountValueBreakdown } from '../../lib/accountValue'
import { formatCoins } from '../../lib/coins'
import { FEATURE_REQUIREMENTS } from '../../lib/permissions'

const PART_LABELS: Record<string, string> = {
  wallet: 'Wallet',
  bank: 'Bank',
  materials: 'Materials',
  commerce: 'Trading post',
  shared: 'Shared slots',
  characters: 'Characters',
}

export function AccountValuePanel() {
  const { apiKey, tokenInfo, canUse } = useApiKey()
  const [data, setData] = useState<AccountValueBreakdown | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const missingForFull = FEATURE_REQUIREMENTS.accountValue.filter(
    (permission) => !(tokenInfo?.permissions ?? []).includes(permission),
  )

  const load = useCallback(async () => {
    if (!apiKey || !canUse('orders')) return
    setLoading(true)
    setError(null)
    try {
      const permissions = new Set(tokenInfo?.permissions ?? [])
      const result = await calculateAccountValue(apiKey, permissions)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to estimate account value')
    } finally {
      setLoading(false)
    }
  }, [apiKey, canUse, tokenInfo?.permissions])

  useEffect(() => {
    void load()
  }, [load])

  if (!canUse('orders')) {
    return (
      <p className="empty-state">Connect an API key with Trading Post permission to estimate account value.</p>
    )
  }

  return (
    <section className="panel nested-panel">
      <div className="panel-header">
        <h3>Account value</h3>
        <button type="button" className="secondary" disabled={loading} onClick={() => void load()}>
          {loading ? 'Calculating…' : 'Refresh'}
        </button>
      </div>

      {missingForFull.length > 0 ? (
        <p className="hint">
          For full scans (including character bags), add: {missingForFull.join(', ')}.
        </p>
      ) : null}

      <p className="hint">{data?.note ?? 'Powered by gw2efficiency account-value for storage you expose via API.'}</p>
      {error ? <p className="error">{error}</p> : null}

      {data ? (
        <>
          <div className="stat-grid summary-grid">
            <div>
              <span>Liquid TP total</span>
              <strong>{formatCoins(data.liquidity.totalLiquid)}</strong>
            </div>
            <div>
              <span>Wallet gold</span>
              <strong>{formatCoins(data.liquidity.walletGold)}</strong>
            </div>
            <div>
              <span>Delivery box</span>
              <strong>{formatCoins(data.liquidity.deliveryGold + data.liquidity.deliveryItemsValue)}</strong>
            </div>
            <div>
              <span>Locked in buy orders</span>
              <strong>{formatCoins(data.liquidity.lockedInBuyOrders)}</strong>
            </div>
            <div>
              <span>Sell listings (net)</span>
              <strong>{formatCoins(data.liquidity.sellListingsNet)}</strong>
            </div>
            {data.storageEstimate !== null ? (
              <div>
                <span>Bank + mats (bid value)</span>
                <strong>{formatCoins(data.storageEstimate)}</strong>
              </div>
            ) : null}
            {data.gw2eSummary !== null ? (
              <div>
                <span>gw2efficiency total</span>
                <strong className="profit">{formatCoins(data.gw2eSummary)}</strong>
                {data.partial ? <small>partial scan</small> : <small>full storage scan</small>}
              </div>
            ) : null}
            {data.charactersIncluded ? (
              <div>
                <span>Characters scanned</span>
                <strong>{data.characterCount}</strong>
              </div>
            ) : null}
          </div>

          {Object.keys(data.gw2eParts).length > 0 ? (
            <ul className="delivery-list compact-breakdown">
              {Object.entries(data.gw2eParts)
                .filter(([, value]) => value !== null && value > 0)
                .map(([key, value]) => (
                  <li key={key}>
                    <span>{PART_LABELS[key] ?? key}</span>
                    <strong>{formatCoins(value ?? 0)}</strong>
                  </li>
                ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

import { useEffect, useState } from 'react'
import { useWatchlist } from '../context/WatchlistProvider'
import {
  loadPriceAlertRules,
  notificationPermission,
  removePriceAlertRule,
  requestNotificationPermission,
  savePriceAlertRules,
  upsertPriceAlertRule,
  type PriceAlertRule,
  type PriceAlertType,
} from '../lib/priceAlerts'

const ALERT_TYPES: { value: PriceAlertType; label: string }[] = [
  { value: 'profit', label: 'Min profit / ROI' },
  { value: 'price_below', label: 'Buy price below' },
  { value: 'spread_wide', label: 'Wide spread %' },
  { value: 'undercut', label: 'Order undercut' },
]

export function PriceAlertsSettings() {
  const { entries } = useWatchlist()
  const [rules, setRules] = useState<PriceAlertRule[]>(() => loadPriceAlertRules())
  const [permission, setPermission] = useState(notificationPermission())

  const enableNotifications = async () => {
    const next = await requestNotificationPermission()
    setPermission(next)
  }

  useEffect(() => {
    savePriceAlertRules(rules)
  }, [rules])

  const addFromWatchlist = () => {
    const existing = new Set(rules.map((row) => `${row.itemId}:${row.alertType ?? 'profit'}`))
    const additions = entries
      .filter((entry) => !existing.has(`${entry.itemId}:profit`))
      .map((entry) => ({
        itemId: entry.itemId,
        name: entry.name,
        minProfit: 50,
        minRoi: 5,
        enabled: true,
        alertType: 'profit' as const,
      }))
    if (additions.length > 0) setRules((current) => [...current, ...additions])
  }

  const updateRule = (itemId: number, alertType: PriceAlertType | undefined, patch: Partial<PriceAlertRule>) => {
    setRules((current) =>
      current.map((row) =>
        row.itemId === itemId && (row.alertType ?? 'profit') === (alertType ?? 'profit')
          ? { ...row, ...patch }
          : row,
      ),
    )
  }

  return (
    <section className="panel nested-panel">
      <h3>Price alerts 2.0</h3>
      <p className="hint">
        Browser notifications for profit thresholds, buy dips, wide spreads, and order undercuts. Checked on
        watchlist refresh.
      </p>

      {permission !== 'granted' ? (
        <button type="button" className="secondary" onClick={() => void enableNotifications()}>
          Enable browser notifications
        </button>
      ) : (
        <p className="status">Notifications enabled</p>
      )}

      <div className="actions">
        <button type="button" className="secondary" onClick={addFromWatchlist} disabled={entries.length === 0}>
          Add watchlist items
        </button>
      </div>

      {rules.length === 0 ? (
        <p className="empty-state">No alert rules yet.</p>
      ) : (
        <ul className="alert-rules">
          {rules.map((rule) => {
            const type = rule.alertType ?? 'profit'
            return (
              <li key={`${rule.itemId}-${type}`}>
                <label className="checkbox compact">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(event) => updateRule(rule.itemId, type, { enabled: event.target.checked })}
                  />
                  {rule.name}
                </label>
                <label>
                  Type
                  <select
                    value={type}
                    onChange={(event) =>
                      updateRule(rule.itemId, type, { alertType: event.target.value as PriceAlertType })
                    }
                  >
                    {ALERT_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {type === 'profit' ? (
                  <>
                    <label>
                      Min profit
                      <input
                        type="number"
                        min={0}
                        value={rule.minProfit}
                        onChange={(event) =>
                          updateRule(rule.itemId, type, { minProfit: Number(event.target.value) })
                        }
                      />
                    </label>
                    <label>
                      Min ROI %
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={rule.minRoi}
                        onChange={(event) =>
                          updateRule(rule.itemId, type, { minRoi: Number(event.target.value) })
                        }
                      />
                    </label>
                  </>
                ) : null}
                {type === 'price_below' ? (
                  <label>
                    Max buy (copper)
                    <input
                      type="number"
                      min={0}
                      value={rule.maxBuyPrice ?? 0}
                      onChange={(event) =>
                        updateRule(rule.itemId, type, { maxBuyPrice: Number(event.target.value) })
                      }
                    />
                  </label>
                ) : null}
                {type === 'spread_wide' ? (
                  <label>
                    Min spread %
                    <input
                      type="number"
                      min={0}
                      value={rule.minSpreadPct ?? 0}
                      onChange={(event) =>
                        updateRule(rule.itemId, type, { minSpreadPct: Number(event.target.value) })
                      }
                    />
                  </label>
                ) : null}
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setRules(removePriceAlertRule(rule.itemId, type))}
                  title="Remove rule"
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export function ensureWatchlistAlertRule(itemId: number, name: string): void {
  const rules = loadPriceAlertRules()
  if (rules.some((row) => row.itemId === itemId && (row.alertType ?? 'profit') === 'profit')) return
  upsertPriceAlertRule({ itemId, name, minProfit: 50, minRoi: 5, enabled: false, alertType: 'profit' })
}

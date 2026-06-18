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
} from '../lib/priceAlerts'

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
    const existing = new Set(rules.map((row) => row.itemId))
    const additions = entries
      .filter((entry) => !existing.has(entry.itemId))
      .map((entry) => ({
        itemId: entry.itemId,
        name: entry.name,
        minProfit: 50,
        minRoi: 5,
        enabled: true,
      }))
    if (additions.length > 0) setRules((current) => [...current, ...additions])
  }

  const updateRule = (itemId: number, patch: Partial<PriceAlertRule>) => {
    setRules((current) =>
      current.map((row) => (row.itemId === itemId ? { ...row, ...patch } : row)),
    )
  }

  return (
    <section className="panel nested-panel">
      <h3>Price alerts</h3>
      <p className="hint">
        Browser notifications when watchlist items meet profit thresholds. Checked on each watchlist refresh.
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
          {rules.map((rule) => (
            <li key={rule.itemId}>
              <label className="checkbox compact">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(event) => updateRule(rule.itemId, { enabled: event.target.checked })}
                />
                {rule.name}
              </label>
              <label>
                Min profit
                <input
                  type="number"
                  min={0}
                  value={rule.minProfit}
                  onChange={(event) =>
                    updateRule(rule.itemId, { minProfit: Number(event.target.value) })
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
                  onChange={(event) => updateRule(rule.itemId, { minRoi: Number(event.target.value) })}
                />
              </label>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setRules(removePriceAlertRule(rule.itemId))}
                title="Remove rule"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function ensureWatchlistAlertRule(itemId: number, name: string): void {
  const rules = loadPriceAlertRules()
  if (rules.some((row) => row.itemId === itemId)) return
  upsertPriceAlertRule({ itemId, name, minProfit: 50, minRoi: 5, enabled: false })
}

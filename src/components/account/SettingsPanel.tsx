import { useState } from 'react'
import { useApiKey } from '../../context/ApiKeyProvider'
import { FEATURE_REQUIREMENTS, PERMISSION_LABELS, type Gw2Permission } from '../../lib/permissions'
import { PriceAlertsSettings } from '../PriceAlertsSettings'

const RECOMMENDED: Gw2Permission[] = ['account', 'tradingpost', 'inventories', 'wallet', 'characters']

export function SettingsPanel() {
  const { apiKey, tokenInfo, account, loading, error, setApiKey, clearKey, refresh, isConnected } =
    useApiKey()
  const [draft, setDraft] = useState(apiKey)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await setApiKey(draft)
    } finally {
      setSaving(false)
    }
  }

  const granted = new Set(tokenInfo?.permissions ?? [])

  return (
    <section className="panel">
      <h2>API key settings</h2>
      <p className="hint">
        Your key stays in this browser only (localStorage). Create one at{' '}
        <a href="https://account.arena.net/applications" target="_blank" rel="noreferrer">
          account.arena.net/applications
        </a>
        . gw2efficiency uses the same ArenaNet keys — there is no separate gw2efficiency API.
      </p>

      <div className="field">
        <label htmlFor="api-key">ArenaNet API key</label>
        <input
          id="api-key"
          type="password"
          autoComplete="off"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="XXXX-XXXX-…"
        />
      </div>

      <div className="actions">
        <button type="button" className="primary" disabled={saving || loading} onClick={() => void save()}>
          {saving || loading ? 'Validating…' : 'Save & validate'}
        </button>
        {apiKey ? (
          <button type="button" className="secondary" onClick={clearKey}>
            Remove key
          </button>
        ) : null}
        {isConnected ? (
          <button type="button" className="secondary" onClick={() => void refresh()}>
            Refresh
          </button>
        ) : null}
      </div>

      {error ? <p className="error">{error}</p> : null}

      {isConnected && tokenInfo ? (
        <div className="key-status">
          <div className="stat-grid">
            <div>
              <span>Key name</span>
              <strong>{tokenInfo.name}</strong>
            </div>
            <div>
              <span>Account</span>
              <strong>{account?.name ?? '—'}</strong>
            </div>
          </div>

          <h3>Permissions</h3>
          <ul className="permission-list">
            {RECOMMENDED.map((permission) => (
              <li key={permission} className={granted.has(permission) ? 'ok' : 'missing'}>
                {PERMISSION_LABELS[permission]}
                {granted.has(permission) ? ' ✓' : ' — missing'}
              </li>
            ))}
          </ul>

          <h3>Feature access</h3>
          <ul className="permission-list">
            {(Object.keys(FEATURE_REQUIREMENTS) as Array<keyof typeof FEATURE_REQUIREMENTS>).map(
              (feature) => {
                const missing = FEATURE_REQUIREMENTS[feature].filter(
                  (permission: string) => !granted.has(permission),
                )
                return (
                  <li key={feature} className={missing.length === 0 ? 'ok' : 'missing'}>
                    {feature}: {missing.length === 0 ? 'ready' : `needs ${missing.join(', ')}`}
                  </li>
                )
              },
            )}
          </ul>
        </div>
      ) : null}

      <PriceAlertsSettings />
    </section>
  )
}

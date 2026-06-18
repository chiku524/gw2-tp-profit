import { useState } from 'react'
import { useApiKey } from '../../context/ApiKeyProvider'
import { FEATURE_LABELS, FEATURE_REQUIREMENTS, PERMISSION_LABELS, type Gw2Permission } from '../../lib/permissions'
import { PriceAlertsSettings } from '../PriceAlertsSettings'

const RECOMMENDED: Gw2Permission[] = [
  'account',
  'tradingpost',
  'inventories',
  'wallet',
  'characters',
  'unlocks',
]

const API_CAPABILITIES = [
  { area: 'Trading Post', public: 'Live prices, listings, gem exchange', auth: 'Your orders, delivery, 90-day history' },
  { area: 'Crafting', public: 'All recipes & combine scans', auth: 'Discovered recipes, character crafting levels' },
  { area: 'Account value', public: '—', auth: 'Wallet, bank, materials, character bags & equipment' },
  { area: 'Not available', public: 'Place/cancel orders, move items, live map events', auth: 'Other players\' private data' },
]

export function SettingsPanel() {
  const { apiKey, tokenInfo, account, loading, error, setApiKey, clearKey, refresh, isConnected } =
    useApiKey()
  const [draft, setDraft] = useState(apiKey)
  const [saving, setSaving] = useState(false)
  const [showApiGuide, setShowApiGuide] = useState(false)

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
                {granted.has(permission) ? ' ✓' : ' — add for more features'}
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
                    {FEATURE_LABELS[feature]}
                    {missing.length === 0 ? ' — ready' : ` — needs ${missing.join(', ')}`}
                  </li>
                )
              },
            )}
          </ul>
        </div>
      ) : null}

      <div className="api-guide">
        <button type="button" className="link-button" onClick={() => setShowApiGuide((value) => !value)}>
          {showApiGuide ? 'Hide' : 'What can the GW2 API do?'}
        </button>
        {showApiGuide ? (
          <div className="api-guide-panel">
            <p className="hint">
              The official API is read-only. This app uses it for market research and account dashboards — it
              cannot place orders or craft for you.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Area</th>
                    <th>Without key</th>
                    <th>With your key</th>
                  </tr>
                </thead>
                <tbody>
                  {API_CAPABILITIES.map((row) => (
                    <tr key={row.area}>
                      <td>{row.area}</td>
                      <td>{row.public}</td>
                      <td>{row.auth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint">
              Rate limit: ~300 requests/minute per IP. Keys cannot be edited — recreate the key to change
              permissions.
            </p>
          </div>
        ) : null}
      </div>

      <PriceAlertsSettings />
    </section>
  )
}

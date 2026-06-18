import { useState } from 'react'
import { AccountPage } from './components/AccountPage'
import { FlipTable } from './components/FlipTable'
import { SettingsPanel } from './components/account/SettingsPanel'
import { ItemLookup, ProfitCalculator } from './components/Tools'
import { useApiKey } from './context/ApiKeyProvider'
import { useFlipScanner } from './hooks/useFlipScanner'
import './App.css'

type Tab = 'scanner' | 'lookup' | 'calculator' | 'account' | 'settings'

function App() {
  const [tab, setTab] = useState<Tab>('scanner')
  const { isConnected, account, loading: keyLoading } = useApiKey()
  const { opportunities, progress, filters, setFilters, runScan, stopScan, isScanning } = useFlipScanner()

  const progressPercent =
    progress.totalIds > 0 ? Math.round((progress.loadedPrices / progress.totalIds) * 100) : 0

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Guild Wars 2 · Trading Post</p>
          <h1>TP Profit Helper</h1>
          <p className="lede">
            Find instant flip opportunities, inspect item spreads, and calculate net profit after ArenaNet fees.
          </p>
          {isConnected ? (
            <p className="connection-badge connected">Connected · {account?.name}</p>
          ) : (
            <p className="connection-badge">No API key · <button type="button" className="link-button" onClick={() => setTab('settings')}>Add in Settings</button></p>
          )}
        </div>
      </header>

      <nav className="tabs" aria-label="Sections">
        <button type="button" className={tab === 'scanner' ? 'active' : ''} onClick={() => setTab('scanner')}>
          Flip scanner
        </button>
        <button type="button" className={tab === 'lookup' ? 'active' : ''} onClick={() => setTab('lookup')}>
          Item lookup
        </button>
        <button type="button" className={tab === 'calculator' ? 'active' : ''} onClick={() => setTab('calculator')}>
          Calculator
        </button>
        <button type="button" className={tab === 'account' ? 'active' : ''} onClick={() => setTab('account')}>
          Account
        </button>
        <button type="button" className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
          Settings
        </button>
      </nav>

      <main>
        {tab === 'scanner' ? (
          <section className="panel">
            <div className="filters">
              <div className="field">
                <label htmlFor="min-profit">Min profit (copper)</label>
                <input
                  id="min-profit"
                  type="number"
                  min={1}
                  value={filters.minProfit}
                  onChange={(event) => setFilters({ ...filters, minProfit: Number(event.target.value) })}
                />
              </div>
              <div className="field">
                <label htmlFor="min-roi">Min ROI %</label>
                <input
                  id="min-roi"
                  type="number"
                  min={0}
                  step={0.1}
                  value={filters.minRoi}
                  onChange={(event) => setFilters({ ...filters, minRoi: Number(event.target.value) })}
                />
              </div>
              <div className="field">
                <label htmlFor="min-volume">Min volume</label>
                <input
                  id="min-volume"
                  type="number"
                  min={1}
                  value={filters.minVolume}
                  onChange={(event) => setFilters({ ...filters, minVolume: Number(event.target.value) })}
                />
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={filters.f2pOnly}
                  onChange={(event) => setFilters({ ...filters, f2pOnly: event.target.checked })}
                />
                Free-to-play items only
              </label>
            </div>

            <div className="actions">
              <button type="button" className="primary" disabled={isScanning} onClick={() => void runScan()}>
                {isScanning ? 'Scanning…' : 'Scan trading post'}
              </button>
              {isScanning ? (
                <button type="button" className="secondary" onClick={stopScan}>
                  Stop
                </button>
              ) : null}
            </div>

            {progress.phase !== 'idle' ? (
              <div className="progress">
                <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
                <p>{progress.message ?? `${progress.loadedPrices.toLocaleString()} / ${progress.totalIds.toLocaleString()} items`}</p>
              </div>
            ) : null}

            <FlipTable rows={opportunities} />
          </section>
        ) : null}

        {tab === 'lookup' ? <ItemLookup /> : null}
        {tab === 'calculator' ? <ProfitCalculator /> : null}
        {tab === 'account' ? <AccountPage /> : null}
        {tab === 'settings' ? <SettingsPanel /> : null}
      </main>

      <footer>
        <p>
          Uses the official <a href="https://wiki.guildwars2.com/wiki/API:2" target="_blank" rel="noreferrer">Guild Wars 2 API</a>.
          {keyLoading ? ' Validating API key…' : null}
          {' '}Not affiliated with ArenaNet or NCSOFT.
        </p>
      </footer>
    </div>
  )
}

export default App

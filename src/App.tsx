import type { AppTab } from './types'
import { useCallback, useEffect, useState } from 'react'
import { AccountPage } from './components/AccountPage'
import { CommandPalette } from './components/CommandPalette'
import { ItemDetailModal } from './components/ItemDetailModal'
import { MarketDashboard } from './components/MarketDashboard'
import { ScannerPage } from './components/ScannerPage'
import { SettingsPanel } from './components/account/SettingsPanel'
import { ProfitCalculator } from './components/Tools'
import { WatchlistPanel } from './components/WatchlistPanel'
import { GlobalSearch } from './components/layout/GlobalSearch'
import { useApiKey } from './context/ApiKeyProvider'
import { useFlipScanner } from './hooks/useFlipScanner'
import { loadPreferredTab, savePreferredTab } from './lib/preferences'
import './App.css'

function App() {
  const [tab, setTab] = useState<AppTab>(() => loadPreferredTab())
  const [browseIds, setBrowseIds] = useState<number[] | null>(null)
  const { isConnected, account, loading: keyLoading } = useApiKey()
  const scanner = useFlipScanner()
  const [lastScan, setLastScan] = useState(scanner.opportunities)

  useEffect(() => {
    if (scanner.progress.phase === 'done' && scanner.opportunities.length > 0) {
      setLastScan(scanner.opportunities)
    }
  }, [scanner.progress.phase, scanner.opportunities])

  const goTab = useCallback((next: AppTab) => {
    setTab(next)
    savePreferredTab(next)
  }, [])

  const handleBrowseGroup = useCallback((itemIds: number[]) => {
    setBrowseIds(itemIds)
    goTab('scanner')
  }, [goTab])

  const clearBrowse = useCallback(() => setBrowseIds(null), [])

  const navigate = useCallback((target: string) => {
    if (
      target === 'market' ||
      target === 'scanner' ||
      target === 'watchlist' ||
      target === 'calculator' ||
      target === 'account' ||
      target === 'settings'
    ) {
      goTab(target)
    }
  }, [goTab])

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <p className="eyebrow">Guild Wars 2 · Trading Post</p>
          <h1>TP Profit Helper</h1>
          {isConnected ? (
            <p className="connection-badge connected">Connected · {account?.name}</p>
          ) : (
            <p className="connection-badge">
              No API key ·{' '}
              <button type="button" className="link-button" onClick={() => goTab('settings')}>
                Add in Settings
              </button>
            </p>
          )}
        </div>
        <GlobalSearch />
      </header>

      <nav className="tabs" aria-label="Sections">
        <button type="button" className={tab === 'market' ? 'active' : ''} onClick={() => goTab('market')}>
          Market
        </button>
        <button type="button" className={tab === 'scanner' ? 'active' : ''} onClick={() => goTab('scanner')}>
          Scanner
        </button>
        <button type="button" className={tab === 'watchlist' ? 'active' : ''} onClick={() => goTab('watchlist')}>
          Watchlist
        </button>
        <button type="button" className={tab === 'calculator' ? 'active' : ''} onClick={() => goTab('calculator')}>
          Calculator
        </button>
        <button type="button" className={tab === 'account' ? 'active' : ''} onClick={() => goTab('account')}>
          Account
        </button>
        <button type="button" className={tab === 'settings' ? 'active' : ''} onClick={() => goTab('settings')}>
          Settings
        </button>
      </nav>

      <main id="main-content" tabIndex={-1}>
        {tab === 'market' ? (
          <MarketDashboard
            lastScan={lastScan}
            onBrowseGroup={handleBrowseGroup}
            onGoAccount={() => goTab('account')}
          />
        ) : null}
        {tab === 'scanner' ? (
          <ScannerPage scanner={scanner} browseIds={browseIds} onBrowseConsumed={clearBrowse} />
        ) : null}
        {tab === 'watchlist' ? <WatchlistPanel /> : null}
        {tab === 'calculator' ? <ProfitCalculator /> : null}
        {tab === 'account' ? <AccountPage /> : null}
        {tab === 'settings' ? <SettingsPanel /> : null}
      </main>

      <footer>
        <p>
          Uses the official{' '}
          <a href="https://wiki.guildwars2.com/wiki/API:2" target="_blank" rel="noreferrer">
            Guild Wars 2 API
          </a>
          . {keyLoading ? 'Validating API key…' : 'Ctrl+K to search.'} Not affiliated with ArenaNet or NCSOFT.
        </p>
      </footer>

      <ItemDetailModal />
      <CommandPalette onNavigate={navigate} />
    </div>
  )
}

export default App

import { useEffect, useState } from 'react'
import { ScanFilterPanel } from './ScanFilterPanel'
import { exportFlipsToCsv } from '../lib/exportCsv'
import { FlipTable } from './FlipTable'
import { ScanPresets } from './ScanPresets'
import { defaultScanFilters, useFlipScanner } from '../hooks/useFlipScanner'
import { getPriceCacheStats, PRICE_CACHE_TTL_MS } from '../lib/priceCache'
import type { ScanFilters } from '../types'

type ScannerApi = ReturnType<typeof useFlipScanner>

type Props = {
  scanner: ScannerApi
  browseIds: number[] | null
  onBrowseConsumed: () => void
}

export function ScannerPage({ scanner, browseIds, onBrowseConsumed }: Props) {
  const {
    opportunities,
    progress,
    filters,
    setFilters,
    runScan,
    runQuickBrowse,
    stopScan,
    isScanning,
    usedCache,
  } = scanner
  const [cacheStats, setCacheStats] = useState<{ count: number; ageMinutes: number | null; isFull: boolean } | null>(
    null,
  )

  useEffect(() => {
    void getPriceCacheStats().then(setCacheStats)
  }, [progress.phase])

  useEffect(() => {
    if (!browseIds?.length) return
    void runQuickBrowse(browseIds).finally(onBrowseConsumed)
  }, [browseIds, runQuickBrowse, onBrowseConsumed])

  const progressPercent =
    progress.totalIds > 0 ? Math.round((progress.loadedPrices / progress.totalIds) * 100) : 0

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Flip scanner</h2>
          <p className="hint">
            Scans ~28k items using live GW2 prices. Repeat scans use a local price cache (refreshed every{' '}
            {Math.round(PRICE_CACHE_TTL_MS / 60_000)} min) for near-instant results. Profit is estimated for a
            listing flip: outbid highest buy (+1c), then undercut lowest sell (−1c) after your buy order fills.
            Armor uses highest buy as the exit price (sell to buy order) because wide spreads make undercutting
            listings unrealistic.
          </p>
          {cacheStats?.isFull ? (
            <p className="hint cache-hint">
              Price cache ready · {cacheStats.count.toLocaleString()} items
              {cacheStats.ageMinutes !== null ? ` · ${cacheStats.ageMinutes}m old` : ''}
            </p>
          ) : null}
        </div>
      </div>

      <ScanPresets filters={filters} onApply={setFilters} />

      <ScanFilterPanel filters={filters} onChange={setFilters} />

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
          {isScanning ? 'Scanning…' : cacheStats?.isFull ? 'Rescan (cached)' : 'Scan trading post'}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={isScanning}
          onClick={() => void runScan({ forceLive: true })}
          title="Bypass cache and fetch fresh prices from the GW2 API (~2–3 min)"
        >
          Live scan
        </button>
        {isScanning ? (
          <button type="button" className="secondary" onClick={stopScan}>
            Stop
          </button>
        ) : (
          <>
            <button
              type="button"
              className="secondary"
              onClick={() => setFilters(defaultScanFilters as ScanFilters)}
            >
              Reset filters
            </button>
            {opportunities.length > 0 ? (
              <button type="button" className="secondary" onClick={() => exportFlipsToCsv(opportunities)}>
                Export CSV
              </button>
            ) : null}
          </>
        )}
      </div>

      {progress.phase === 'done' && usedCache ? (
        <p className="hint cache-hint">Results used cached prices. Run a live scan for the freshest market data.</p>
      ) : null}

      {progress.phase !== 'idle' ? (
        <div className="progress">
          <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
          <p>
            {progress.message ??
              `${progress.loadedPrices.toLocaleString()} / ${progress.totalIds.toLocaleString()} items`}
          </p>
        </div>
      ) : null}

      <FlipTable rows={opportunities} scanFilters={filters} />
    </section>
  )
}

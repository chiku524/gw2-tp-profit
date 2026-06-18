import { useEffect } from 'react'
import { ProfitMovesTable } from './ProfitMovesTable'
import { defaultProfitMoveFilters, useProfitMoves } from '../hooks/useProfitMoves'
import { saveProfitMovesCache } from '../lib/preferences'
import type { ProfitMoveFilters, ProfitMoveKind } from '../types'

export function CraftsPage() {
  const { moves, progress, filters, setFilters, runScan, stopScan, isScanning } = useProfitMoves()

  useEffect(() => {
    if (progress.phase === 'done' && moves.length > 0) {
      saveProfitMovesCache(moves)
    }
  }, [progress.phase, moves])

  const progressPercent = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0

  const toggleKind = (kind: ProfitMoveKind) => {
    setFilters((current) => {
      const has = current.kinds.includes(kind)
      const kinds = has ? current.kinds.filter((value) => value !== kind) : [...current.kinds, kind]
      return { ...current, kinds: kinds.length ? kinds : [kind] }
    })
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Refinements &amp; crafts</h2>
          <p className="hint">
            Scans GW2 combine recipes (refinements like 2× ore → ingot, and simple component crafts). Profit
            assumes you buy ingredients at lowest sell and list the output undercutting lowest sell (−1c), including
            5% listing + 10% exchange fees.
          </p>
        </div>
      </div>

      <div className="chip-row kind-filters">
        <button
          type="button"
          className={`chip-btn ${filters.kinds.includes('refinement') ? 'active' : ''}`}
          onClick={() => toggleKind('refinement')}
        >
          Refinements
        </button>
        <button
          type="button"
          className={`chip-btn ${filters.kinds.includes('craft') ? 'active' : ''}`}
          onClick={() => toggleKind('craft')}
        >
          Crafts
        </button>
      </div>

      <div className="filters">
        <div className="field">
          <label htmlFor="craft-min-profit">Min profit (copper)</label>
          <input
            id="craft-min-profit"
            type="number"
            min={1}
            value={filters.minProfit}
            onChange={(event) => setFilters({ ...filters, minProfit: Number(event.target.value) })}
          />
        </div>
        <div className="field">
          <label htmlFor="craft-min-roi">Min ROI %</label>
          <input
            id="craft-min-roi"
            type="number"
            min={0}
            step={0.1}
            value={filters.minRoi}
            onChange={(event) => setFilters({ ...filters, minRoi: Number(event.target.value) })}
          />
        </div>
        <div className="field">
          <label htmlFor="craft-max-results">Max results</label>
          <input
            id="craft-max-results"
            type="number"
            min={10}
            max={200}
            value={filters.maxResults}
            onChange={(event) => setFilters({ ...filters, maxResults: Number(event.target.value) })}
          />
        </div>
      </div>

      <div className="actions">
        <button type="button" className="primary" disabled={isScanning} onClick={() => void runScan()}>
          {isScanning ? 'Scanning…' : 'Scan combines'}
        </button>
        {isScanning ? (
          <button type="button" className="secondary" onClick={stopScan}>
            Stop
          </button>
        ) : (
          <button
            type="button"
            className="secondary"
            onClick={() => setFilters(defaultProfitMoveFilters as ProfitMoveFilters)}
          >
            Reset filters
          </button>
        )}
      </div>

      {progress.phase !== 'idle' ? (
        <div className="progress">
          <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
          <p>{progress.message ?? `${progress.loaded.toLocaleString()} / ${progress.total.toLocaleString()}`}</p>
        </div>
      ) : null}

      <ProfitMovesTable rows={moves} kindFilter={filters.kinds} />
    </section>
  )
}

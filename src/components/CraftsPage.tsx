import { useEffect, useState } from 'react'
import { BulkCraftPlanner } from './BulkCraftPlanner'
import { ProfitChainsPanel } from './ProfitChainsPanel'
import { ProfitMovesTable } from './ProfitMovesTable'
import { PermissionHint } from './PermissionGate'
import { defaultProfitMoveFilters, useProfitMoves } from '../hooks/useProfitMoves'
import { useApiKey } from '../context/ApiKeyProvider'
import { useCraftingContext } from '../hooks/useCraftingContext'
import { craftingLevelSummary } from '../lib/recipeAccess'
import { saveProfitMovesCache } from '../lib/preferences'
import { DISCIPLINE_OPTIONS, toggleDiscipline } from '../lib/disciplines'
import type { ProfitMoveFilters, ProfitMoveKind, ProfitMove, ProfitMoveSortMode } from '../types'

const SORT_MODE_OPTIONS: { id: ProfitMoveSortMode; label: string; hint: string }[] = [
  { id: 'profit', label: 'Raw profit', hint: 'Highest profit per craft' },
  { id: 'roi', label: 'ROI', hint: 'Best return on ingredient cost' },
  {
    id: 'volume_weighted',
    label: 'Volume-weighted',
    hint: 'Profit × log₁₀(market depth) — favors liquid combines',
  },
]

export function CraftsPage() {
  const { canUse, isConnected } = useApiKey()
  const { context: craftingContext } = useCraftingContext()
  const { moves, progress, filters, setFilters, runScan, stopScan, isScanning } = useProfitMoves()
  const [planMove, setPlanMove] = useState<ProfitMove | null>(null)

  useEffect(() => {
    if (progress.phase === 'done' && moves.length > 0) {
      saveProfitMovesCache(moves)
    }
  }, [progress.phase, moves])

  const progressPercent = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0
  const levelSummary = craftingLevelSummary(craftingContext)

  const toggleKind = (kind: ProfitMoveKind) => {
    setFilters((current) => {
      const has = current.kinds.includes(kind)
      const kinds = has ? current.kinds.filter((value) => value !== kind) : [...current.kinds, kind]
      return { ...current, kinds: kinds.length ? kinds : [kind] }
    })
  }

  const toggleDisciplineFilter = (discipline: string) => {
    setFilters((current) => ({
      ...current,
      disciplines: toggleDiscipline(current.disciplines, discipline),
    }))
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Refinements &amp; crafts</h2>
          <p className="hint">
            Scans GW2 combine recipes (refinements like 2× ore → ingot, and simple component crafts). Profit
            assumes you buy ingredients at lowest sell and list the output undercutting lowest sell (−1c), including
            5% listing + 10% exchange fees. Use volume-weighted sort to favor profitable combines with real market
            depth.
          </p>
          {isConnected && levelSummary ? (
            <p className="hint">Your highest crafting levels: {levelSummary}</p>
          ) : null}
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

      <div className="filter-section-static">
        <div className="filter-section-summary">
          <span className="field-label">Crafting disciplines</span>
          <span className="hint">
            {filters.disciplines.length === 0
              ? 'Any discipline'
              : `${filters.disciplines.length} selected`}
          </span>
          {filters.disciplines.length > 0 ? (
            <button
              type="button"
              className="filter-section-clear"
              onClick={() => setFilters({ ...filters, disciplines: [] })}
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="category-chips">
          {DISCIPLINE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={filters.disciplines.includes(option.id) ? 'category-chip active' : 'category-chip'}
              onClick={() => toggleDisciplineFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
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
        <div className="field">
          <label htmlFor="craft-min-volume">Min market depth</label>
          <input
            id="craft-min-volume"
            type="number"
            min={0}
            value={filters.minVolume}
            onChange={(event) => setFilters({ ...filters, minVolume: Number(event.target.value) })}
          />
        </div>
      </div>

      <div className="filter-section-static">
        <div className="filter-section-summary">
          <span className="field-label">Sort results by</span>
          <span className="hint">
            {SORT_MODE_OPTIONS.find((option) => option.id === filters.sortMode)?.hint}
          </span>
        </div>
        <div className="chip-row kind-filters">
          {SORT_MODE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`chip-btn ${filters.sortMode === option.id ? 'active' : ''}`}
              onClick={() => setFilters({ ...filters, sortMode: option.id })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="account-filter-toggles">
        {isConnected ? (
          <>
            {canUse('craftingLevels') ? (
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={filters.onlyWithinMyLevels}
                  disabled={filters.onlyCraftable}
                  onChange={(event) =>
                    setFilters({ ...filters, onlyWithinMyLevels: event.target.checked })
                  }
                />
                Only within my crafting levels
              </label>
            ) : (
              <PermissionHint feature="craftingLevels" compact />
            )}
            {canUse('recipeUnlocks') && canUse('craftingLevels') ? (
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={filters.onlyCraftable}
                  onChange={(event) =>
                    setFilters({
                      ...filters,
                      onlyCraftable: event.target.checked,
                      onlyWithinMyLevels: event.target.checked ? true : filters.onlyWithinMyLevels,
                    })
                  }
                />
                Only discovered recipes I can craft (levels + unlocks)
              </label>
            ) : canUse('craftingLevels') ? null : (
              <PermissionHint feature="recipeUnlocks" compact />
            )}
          </>
        ) : (
          <p className="hint">
            Connect an API key with Characters (and Unlocks for recipe filtering) to limit results to
            what your account can craft.
          </p>
        )}
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

      <ProfitMovesTable rows={moves} kindFilter={filters.kinds} sortMode={filters.sortMode} onPlanBulk={setPlanMove} />

      <ProfitChainsPanel />

      <BulkCraftPlanner move={planMove} onClose={() => setPlanMove(null)} />
    </section>
  )
}

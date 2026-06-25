import { useCallback, useRef, useState } from 'react'
import { useCraftingContext } from './useCraftingContext'
import {
  defaultProfitMoveFilters,
  scanProfitMoves,
} from '../lib/profitMoves'
import { loadProfitMoveFilters, loadProfitMovesCache, saveProfitMoveFilters } from '../lib/preferences'
import type { ProfitMove, ProfitMoveFilters } from '../types'

export { defaultProfitMoveFilters }

type ScanProgress = {
  phase: 'idle' | 'scanning' | 'done' | 'error'
  message?: string
  loaded: number
  total: number
}

function loadFilters(): ProfitMoveFilters {
  const saved = loadProfitMoveFilters()
  if (!saved) return defaultProfitMoveFilters
  return {
    ...defaultProfitMoveFilters,
    ...saved,
    kinds: saved.kinds ?? defaultProfitMoveFilters.kinds,
    onlyCraftable: saved.onlyCraftable ?? defaultProfitMoveFilters.onlyCraftable,
    onlyWithinMyLevels: saved.onlyWithinMyLevels ?? defaultProfitMoveFilters.onlyWithinMyLevels,
    disciplines: saved.disciplines ?? defaultProfitMoveFilters.disciplines,
    sortMode: saved.sortMode ?? defaultProfitMoveFilters.sortMode,
    minVolume: saved.minVolume ?? defaultProfitMoveFilters.minVolume,
  }
}

export function useProfitMoves() {
  const { context: craftingContext } = useCraftingContext()
  const [moves, setMoves] = useState<ProfitMove[]>(() => loadProfitMovesCache()?.moves ?? [])
  const [progress, setProgress] = useState<ScanProgress>({ phase: 'idle', loaded: 0, total: 0 })
  const [filters, setFiltersState] = useState<ProfitMoveFilters>(loadFilters)
  const abortRef = useRef(false)

  const setFilters = useCallback((next: ProfitMoveFilters | ((prev: ProfitMoveFilters) => ProfitMoveFilters)) => {
    setFiltersState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next
      saveProfitMoveFilters(value)
      return value
    })
  }, [])

  const runScan = useCallback(async () => {
    abortRef.current = false
    setMoves([])
    setProgress({ phase: 'scanning', loaded: 0, total: 1, message: 'Starting…' })

    try {
      const results = await scanProfitMoves(
        filters,
        (message, loaded, total) => {
          if (!abortRef.current) setProgress({ phase: 'scanning', message, loaded, total })
        },
        { get aborted() { return abortRef.current } },
        filters.onlyCraftable || filters.onlyWithinMyLevels ? craftingContext : null,
      )
      if (abortRef.current) return
      setMoves(results)
      setProgress({
        phase: 'done',
        loaded: results.length,
        total: results.length,
        message: `Found ${results.length} profitable combine${results.length === 1 ? '' : 's'}`,
      })
    } catch (error) {
      setProgress({
        phase: 'error',
        loaded: 0,
        total: 0,
        message: error instanceof Error ? error.message : 'Scan failed',
      })
    }
  }, [filters, craftingContext])

  const stopScan = useCallback(() => {
    abortRef.current = true
    setProgress((current) =>
      current.phase === 'scanning' ? { ...current, phase: 'done', message: 'Scan stopped' } : current,
    )
  }, [])

  return {
    moves,
    progress,
    filters,
    setFilters,
    runScan,
    stopScan,
    isScanning: progress.phase === 'scanning',
  }
}

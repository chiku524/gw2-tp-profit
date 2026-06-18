import { useCallback, useRef, useState } from 'react'
import { batchCommercePrices, fetchCommercePriceIds, fetchCommercePrices } from '../lib/gw2Api'
import { enrichFlipOpportunities } from '../lib/itemNames'
import { loadScanFilters, saveScanFilters } from '../lib/preferences'
import { matchesFromPrices } from '../lib/scannerMatch'
import type { FlipOpportunity, ScanFilters, ScanProgress } from '../types'

export const defaultScanFilters: ScanFilters = {
  minProfit: 50,
  minRoi: 5,
  minVolume: 10,
  f2pOnly: false,
  maxItems: 100,
  categories: [],
}

function loadFilters(): ScanFilters {
  const saved = loadScanFilters()
  if (!saved) return defaultScanFilters
  return { ...defaultScanFilters, ...saved, categories: saved.categories ?? [] }
}

export function useFlipScanner() {
  const [opportunities, setOpportunities] = useState<FlipOpportunity[]>([])
  const [progress, setProgress] = useState<ScanProgress>({ phase: 'idle', totalIds: 0, loadedPrices: 0 })
  const [filters, setFiltersState] = useState<ScanFilters>(loadFilters)
  const abortRef = useRef(false)
  const publishGeneration = useRef(0)

  const setFilters = useCallback((next: ScanFilters | ((prev: ScanFilters) => ScanFilters)) => {
    setFiltersState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next
      saveScanFilters(value)
      return value
    })
  }, [])

  const publishMatches = useCallback(async (rows: FlipOpportunity[]) => {
    const generation = ++publishGeneration.current
    const enriched = await enrichFlipOpportunities(rows)
    if (abortRef.current || generation !== publishGeneration.current) return
    setOpportunities(enriched)
  }, [])

  const stopScan = useCallback(() => {
    abortRef.current = true
    setProgress((current) =>
      current.phase === 'done' || current.phase === 'error' || current.phase === 'idle'
        ? current
        : { ...current, phase: 'done', message: 'Scan stopped' },
    )
  }, [])

  const runScan = useCallback(async () => {
    abortRef.current = false
    publishGeneration.current += 1
    setOpportunities([])
    setProgress({ phase: 'loading-ids', totalIds: 0, loadedPrices: 0 })

    try {
      const ids = await fetchCommercePriceIds()
      if (abortRef.current) return

      setProgress({ phase: 'loading-prices', totalIds: ids.length, loadedPrices: 0, message: 'Scanning prices…' })

      const matches: FlipOpportunity[] = []
      const categoryNote =
        filters.categories.length > 0 ? ` · ${filters.categories.length} categor${filters.categories.length === 1 ? 'y' : 'ies'}` : ''

      for await (const batch of batchCommercePrices(ids, (loaded, total) => {
        if (!abortRef.current) {
          setProgress({
            phase: 'loading-prices',
            totalIds: total,
            loadedPrices: loaded,
            message: `Scanning… ${matches.length} matches${categoryNote} · ${loaded.toLocaleString()}/${total.toLocaleString()}`,
          })
        }
      })) {
        if (abortRef.current) break

        const batchMatches = await matchesFromPrices(batch, filters)
        matches.push(...batchMatches)

        matches.sort((a, b) => b.listingProfit - a.listingProfit)
        if (matches.length > filters.maxItems * 3) {
          matches.length = filters.maxItems * 3
        }

        if (matches.length > 0 && matches.length % 20 === 0) {
          setProgress((current) => ({
            ...current,
            message: `Scanning… ${matches.length} matches${categoryNote} · loading names…`,
          }))
          void publishMatches(matches.slice(0, filters.maxItems))
        }
      }

      if (abortRef.current) return

      setProgress({
        phase: 'loading-items',
        totalIds: ids.length,
        loadedPrices: ids.length,
        message: 'Loading item names…',
      })

      const top = matches.slice(0, filters.maxItems)
      await publishMatches(top)

      setProgress({
        phase: 'done',
        totalIds: ids.length,
        loadedPrices: ids.length,
        message: `Found ${top.length} opportunities${categoryNote}`,
      })
    } catch (error) {
      setProgress({
        phase: 'error',
        totalIds: 0,
        loadedPrices: 0,
        message: error instanceof Error ? error.message : 'Scan failed',
      })
    }
  }, [filters, publishMatches])

  const runQuickBrowse = useCallback(
    async (itemIds: number[]) => {
      setProgress({ phase: 'loading-prices', totalIds: itemIds.length, loadedPrices: 0 })
      setOpportunities([])

      try {
        const prices = await fetchCommercePrices(itemIds)
        const matches = (await matchesFromPrices(prices, { ...filters, minProfit: 0, minRoi: 0, minVolume: 0 }))
          .sort((a, b) => b.listingProfit - a.listingProfit)

        setProgress({
          phase: 'loading-items',
          totalIds: itemIds.length,
          loadedPrices: itemIds.length,
          message: 'Loading item names…',
        })

        await publishMatches(matches)

        setProgress({
          phase: 'done',
          totalIds: itemIds.length,
          loadedPrices: itemIds.length,
          message: `Loaded ${matches.length} items`,
        })
      } catch (error) {
        setProgress({
          phase: 'error',
          totalIds: 0,
          loadedPrices: 0,
          message: error instanceof Error ? error.message : 'Browse failed',
        })
      }
    },
    [filters, publishMatches],
  )

  return {
    opportunities,
    progress,
    filters,
    setFilters,
    runScan,
    runQuickBrowse,
    stopScan,
    isScanning:
      progress.phase === 'loading-ids' ||
      progress.phase === 'loading-prices' ||
      progress.phase === 'loading-items',
  }
}

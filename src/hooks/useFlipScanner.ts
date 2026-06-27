import { useCallback, useRef, useState } from 'react'
import { batchCommercePrices, fetchCommercePriceIds, fetchCommercePrices } from '../lib/gw2Api'
import { enrichFlipOpportunities } from '../lib/itemNames'
import { loadAllFreshPrices, putCachedPrices } from '../lib/priceCache'
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
  disciplines: [],
  subtypes: [],
}

function loadFilters(): ScanFilters {
  const saved = loadScanFilters()
  if (!saved) return defaultScanFilters
  return {
    ...defaultScanFilters,
    ...saved,
    categories: saved.categories ?? [],
    disciplines: saved.disciplines ?? [],
    subtypes: saved.subtypes ?? [],
  }
}

function needsDisciplineData(filters: ScanFilters): boolean {
  return filters.disciplines.length > 0 || filters.subtypes.length > 0
}

export function useFlipScanner() {
  const [opportunities, setOpportunities] = useState<FlipOpportunity[]>([])
  const [progress, setProgress] = useState<ScanProgress>({ phase: 'idle', totalIds: 0, loadedPrices: 0 })
  const [filters, setFiltersState] = useState<ScanFilters>(loadFilters)
  const [usedCache, setUsedCache] = useState(false)
  const abortRef = useRef(false)
  const publishGeneration = useRef(0)

  const setFilters = useCallback((next: ScanFilters | ((prev: ScanFilters) => ScanFilters)) => {
    setFiltersState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next
      saveScanFilters(value)
      return value
    })
  }, [])

  const publishMatches = useCallback(
    async (rows: FlipOpportunity[], scanFilters: ScanFilters) => {
      const generation = ++publishGeneration.current
      const enriched = await enrichFlipOpportunities(rows, {
        includeDisciplines: needsDisciplineData(scanFilters),
      })
      if (abortRef.current || generation !== publishGeneration.current) return
      setOpportunities(enriched)
    },
    [],
  )

  const stopScan = useCallback(() => {
    abortRef.current = true
    setProgress((current) =>
      current.phase === 'done' || current.phase === 'error' || current.phase === 'idle'
        ? current
        : { ...current, phase: 'done', message: 'Scan stopped' },
    )
  }, [])

  const processPrices = useCallback(
    async (allPrices: { id: number }[], scanFilters: ScanFilters, fromCache: boolean) => {
      setUsedCache(fromCache)
      const matches: FlipOpportunity[] = []
      const categoryNote =
        scanFilters.categories.length > 0 ||
        scanFilters.disciplines.length > 0 ||
        scanFilters.subtypes.length > 0
          ? ` · ${[
              scanFilters.categories.length > 0
                ? `${scanFilters.categories.length} categor${scanFilters.categories.length === 1 ? 'y' : 'ies'}`
                : '',
              scanFilters.disciplines.length > 0
                ? `${scanFilters.disciplines.length} discipline${scanFilters.disciplines.length === 1 ? '' : 's'}`
                : '',
              scanFilters.subtypes.length > 0
                ? `${scanFilters.subtypes.length} subtype${scanFilters.subtypes.length === 1 ? '' : 's'}`
                : '',
            ]
              .filter(Boolean)
              .join(', ')}`
          : ''

      const batchSize = fromCache ? 2000 : 200
      for (let index = 0; index < allPrices.length; index += batchSize) {
        if (abortRef.current) return

        const batch = allPrices.slice(index, index + batchSize) as import('../types').CommercePrice[]
        const batchMatches = await matchesFromPrices(batch, scanFilters, {
          onProgress: (message, loaded, total) => {
            if (!abortRef.current) {
              setProgress({
                phase: 'loading-prices',
                totalIds: total,
                loadedPrices: loaded,
                message: `${message} · ${matches.length} matches${categoryNote}`,
              })
            }
          },
          signal: { get aborted() { return abortRef.current } },
        })
        matches.push(...batchMatches)

        matches.sort((a, b) => b.listingProfit - a.listingProfit)
        if (matches.length > scanFilters.maxItems * 3) {
          matches.length = scanFilters.maxItems * 3
        }

        setProgress({
          phase: 'loading-prices',
          totalIds: allPrices.length,
          loadedPrices: Math.min(index + batch.length, allPrices.length),
          message: fromCache
            ? `Filtering cached prices… ${matches.length} matches${categoryNote}`
            : `Scanning… ${matches.length} matches${categoryNote} · ${Math.min(index + batch.length, allPrices.length).toLocaleString()}/${allPrices.length.toLocaleString()}`,
        })

        if (matches.length > 0 && matches.length % 20 === 0) {
          void publishMatches(matches.slice(0, scanFilters.maxItems), scanFilters)
        }
      }

      if (abortRef.current) return

      setProgress({
        phase: 'loading-items',
        totalIds: allPrices.length,
        loadedPrices: allPrices.length,
        message: 'Loading item names…',
      })

      const top = matches.slice(0, scanFilters.maxItems)
      await publishMatches(top, scanFilters)

      setProgress({
        phase: 'done',
        totalIds: allPrices.length,
        loadedPrices: allPrices.length,
        message: fromCache
          ? `Found ${top.length} opportunities (cached prices)${categoryNote}`
          : `Found ${top.length} opportunities${categoryNote}`,
      })
    },
    [publishMatches],
  )

  const runScan = useCallback(
    async (options?: { forceLive?: boolean }) => {
      abortRef.current = false
      publishGeneration.current += 1
      setOpportunities([])
      setUsedCache(false)
      setProgress({ phase: 'loading-ids', totalIds: 0, loadedPrices: 0 })

      try {
        const ids = await fetchCommercePriceIds()
        if (abortRef.current) return

        if (!options?.forceLive) {
          const cached = await loadAllFreshPrices()
          if (cached && cached.length >= ids.length * 0.98) {
            setProgress({
              phase: 'loading-prices',
              totalIds: cached.length,
              loadedPrices: 0,
              message: 'Using cached prices (instant rescan)…',
            })
            await processPrices(cached, filters, true)
            return
          }
        }

        setProgress({
          phase: 'loading-prices',
          totalIds: ids.length,
          loadedPrices: 0,
          message: options?.forceLive ? 'Fetching live prices…' : 'Scanning prices…',
        })

        const allPrices: import('../types').CommercePrice[] = []
        for await (const batch of batchCommercePrices(
          ids,
          (loaded, total) => {
            if (!abortRef.current) {
              setProgress({
                phase: 'loading-prices',
                totalIds: total,
                loadedPrices: loaded,
                message: `Scanning… ${loaded.toLocaleString()}/${total.toLocaleString()}`,
              })
            }
          },
          { skipCache: options?.forceLive },
        )) {
          if (abortRef.current) break
          allPrices.push(...batch)
        }

        if (abortRef.current) return

        void putCachedPrices(allPrices, true)
        await processPrices(allPrices, filters, false)
      } catch (error) {
        setProgress({
          phase: 'error',
          totalIds: 0,
          loadedPrices: 0,
          message: error instanceof Error ? error.message : 'Scan failed',
        })
      }
    },
    [filters, processPrices],
  )

  const runQuickBrowse = useCallback(
    async (itemIds: number[]) => {
      setProgress({ phase: 'loading-prices', totalIds: itemIds.length, loadedPrices: 0 })
      setOpportunities([])
      setUsedCache(false)

      try {
        const prices = await fetchCommercePrices(itemIds)
        const matches = (
          await matchesFromPrices(prices, { ...filters, minProfit: 0, minRoi: 0, minVolume: 0 })
        ).sort((a, b) => b.listingProfit - a.listingProfit)

        setProgress({
          phase: 'loading-items',
          totalIds: itemIds.length,
          loadedPrices: itemIds.length,
          message: 'Loading item names…',
        })

        await publishMatches(matches, filters)

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
    usedCache,
    isScanning:
      progress.phase === 'loading-ids' ||
      progress.phase === 'loading-prices' ||
      progress.phase === 'loading-items',
  }
}

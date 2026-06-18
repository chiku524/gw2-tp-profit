import { useCallback, useRef, useState } from 'react'
import { batchCommercePrices, fetchCommercePriceIds, fetchCommercePrices, fetchItems } from '../lib/gw2Api'
import { loadScanFilters, saveScanFilters } from '../lib/preferences'
import { opportunityFromPrice } from '../lib/profit'
import type { FlipOpportunity, ScanFilters, ScanProgress } from '../types'

export const defaultScanFilters: ScanFilters = {
  minProfit: 50,
  minRoi: 5,
  minVolume: 10,
  f2pOnly: false,
  maxItems: 100,
}

export function useFlipScanner() {
  const [opportunities, setOpportunities] = useState<FlipOpportunity[]>([])
  const [progress, setProgress] = useState<ScanProgress>({ phase: 'idle', totalIds: 0, loadedPrices: 0 })
  const [filters, setFiltersState] = useState<ScanFilters>(() => loadScanFilters() ?? defaultScanFilters)
  const abortRef = useRef(false)

  const setFilters = useCallback((next: ScanFilters | ((prev: ScanFilters) => ScanFilters)) => {
    setFiltersState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next
      saveScanFilters(value)
      return value
    })
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
    setOpportunities([])
    setProgress({ phase: 'loading-ids', totalIds: 0, loadedPrices: 0 })

    try {
      const ids = await fetchCommercePriceIds()
      if (abortRef.current) return

      setProgress({ phase: 'loading-prices', totalIds: ids.length, loadedPrices: 0, message: 'Scanning prices…' })

      const matches: FlipOpportunity[] = []

      for await (const batch of batchCommercePrices(ids, (loaded, total) => {
        if (!abortRef.current) {
          setProgress({
            phase: 'loading-prices',
            totalIds: total,
            loadedPrices: loaded,
            message: `Scanning… ${matches.length} matches · ${loaded.toLocaleString()}/${total.toLocaleString()}`,
          })
        }
      })) {
        if (abortRef.current) break

        for (const price of batch) {
          if (filters.f2pOnly && !price.whitelisted) continue
          const opportunity = opportunityFromPrice(price)
          if (!opportunity) continue
          if (opportunity.instantProfit < filters.minProfit) continue
          if (opportunity.instantRoi < filters.minRoi) continue
          if (Math.min(opportunity.buyVolume, opportunity.sellVolume) < filters.minVolume) continue
          matches.push(opportunity)
        }

        matches.sort((a, b) => b.instantProfit - a.instantProfit)
        if (matches.length > filters.maxItems * 3) {
          matches.length = filters.maxItems * 3
        }

        if (matches.length > 0 && matches.length % 20 === 0) {
          setOpportunities(matches.slice(0, filters.maxItems))
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
      const itemIds = top.map((row) => row.itemId)
      const items = await fetchItems(itemIds)
      const itemMap = new Map(items.map((item) => [item.id, item]))

      const enriched = top.map((row) => {
        const item = itemMap.get(row.itemId)
        return {
          ...row,
          itemName: item?.name ?? row.itemName,
          icon: item?.icon,
        }
      })

      setOpportunities(enriched)
      setProgress({
        phase: 'done',
        totalIds: ids.length,
        loadedPrices: ids.length,
        message: `Found ${enriched.length} opportunities`,
      })
    } catch (error) {
      setProgress({
        phase: 'error',
        totalIds: 0,
        loadedPrices: 0,
        message: error instanceof Error ? error.message : 'Scan failed',
      })
    }
  }, [filters])

  const runQuickBrowse = useCallback(async (itemIds: number[]) => {
    setProgress({ phase: 'loading-prices', totalIds: itemIds.length, loadedPrices: 0 })
    setOpportunities([])

    try {
      const prices = await fetchCommercePrices(itemIds)
      const matches = prices
        .map((price) => opportunityFromPrice(price))
        .filter((row): row is FlipOpportunity => row !== null)
        .sort((a, b) => b.instantProfit - a.instantProfit)

      const items = await fetchItems(itemIds)
      const itemMap = new Map(items.map((item) => [item.id, item]))

      setOpportunities(
        matches.map((row) => {
          const item = itemMap.get(row.itemId)
          return {
            ...row,
            itemName: item?.name ?? row.itemName,
            icon: item?.icon,
          }
        }),
      )
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
  }, [])

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

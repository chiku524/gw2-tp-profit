import { useCallback, useRef, useState } from 'react'
import { batchCommercePrices, fetchCommercePriceIds, fetchItems } from '../lib/gw2Api'
import { opportunityFromPrice } from '../lib/profit'
import type { FlipOpportunity, ScanProgress } from '../types'

type ScanFilters = {
  minProfit: number
  minRoi: number
  minVolume: number
  f2pOnly: boolean
  maxItems: number
}

const defaultFilters: ScanFilters = {
  minProfit: 50,
  minRoi: 5,
  minVolume: 1,
  f2pOnly: false,
  maxItems: 100,
}

export function useFlipScanner() {
  const [opportunities, setOpportunities] = useState<FlipOpportunity[]>([])
  const [progress, setProgress] = useState<ScanProgress>({ phase: 'idle', totalIds: 0, loadedPrices: 0 })
  const [filters, setFilters] = useState<ScanFilters>(defaultFilters)
  const abortRef = useRef(false)

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

      setProgress({ phase: 'loading-prices', totalIds: ids.length, loadedPrices: 0 })

      const matches: FlipOpportunity[] = []

      for await (const batch of batchCommercePrices(ids, (loaded, total) => {
        if (!abortRef.current) {
          setProgress({ phase: 'loading-prices', totalIds: total, loadedPrices: loaded })
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

  return {
    opportunities,
    progress,
    filters,
    setFilters,
    runScan,
    stopScan,
    isScanning: progress.phase === 'loading-ids' || progress.phase === 'loading-prices' || progress.phase === 'loading-items',
  }
}

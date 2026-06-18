import { useCallback, useEffect, useState } from 'react'
import { enrichFlipOpportunities, isPlaceholderName } from '../lib/itemNames'
import type { FlipOpportunity } from '../types'

/** Ensures displayed flip rows have resolved GW2 item names (not "Item 123"). */
export function useNamedFlips(rows: FlipOpportunity[]): FlipOpportunity[] {
  const [named, setNamed] = useState(rows)

  useEffect(() => {
    setNamed(rows)
    const needsNames = rows.some((row) => isPlaceholderName(row.itemName, row.itemId))
    if (!needsNames) return

    let cancelled = false
    void enrichFlipOpportunities(rows).then((enriched) => {
      if (!cancelled) setNamed(enriched)
    })

    return () => {
      cancelled = true
    }
  }, [rows])

  return named
}

export function useResolveItemName(itemId: number, fallback: string): string {
  const [name, setName] = useState(fallback)

  const resolve = useCallback(async () => {
    const { resolveItemName } = await import('../lib/itemNames')
    const item = await resolveItemName(itemId)
    if (item) setName(item.name)
  }, [itemId])

  useEffect(() => {
    if (!isPlaceholderName(fallback, itemId)) {
      setName(fallback)
      return
    }
    void resolve()
  }, [fallback, itemId, resolve])

  return name
}

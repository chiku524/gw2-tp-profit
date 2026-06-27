import type { VercelRequest, VercelResponse } from '@vercel/node'
import { pushPriceSnapshot, readDynamicTrackedIds } from '../_lib/redis.js'
import {
  CORE_TRACKED_ITEM_IDS,
  MAX_SNAPSHOT_POINTS,
  mergeTrackedIds,
  uniqueTrackedIds,
} from '../_lib/trackedItems.js'

const API_BASE = 'https://api.guildwars2.com/v2'
const BATCH = 200

type Gw2Price = {
  id: number
  buys: { unit_price: number }
  sells: { unit_price: number }
}

async function fetchPrices(ids: number[]): Promise<Gw2Price[]> {
  const response = await fetch(`${API_BASE}/commerce/prices?ids=${ids.join(',')}`)
  if (!response.ok) throw new Error(`GW2 API HTTP ${response.status}`)
  const data = await response.json()
  return Array.isArray(data) ? data : [data]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers.authorization
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).send('Unauthorized')
    return
  }

  let stored = 0
  const errors: string[] = []

  let dynamicIds: number[] = []
  try {
    dynamicIds = await readDynamicTrackedIds(250)
  } catch {
    errors.push('Failed to read dynamic tracked items')
  }

  const tracked = mergeTrackedIds(CORE_TRACKED_ITEM_IDS, dynamicIds)

  for (let index = 0; index < tracked.length; index += BATCH) {
    const batch = tracked.slice(index, index + BATCH)
    try {
      const prices = await fetchPrices(batch)
      for (const price of prices) {
        const snapshot = {
          t: Date.now(),
          buy: price.sells.unit_price,
          sell: price.buys.unit_price,
        }
        try {
          if (await pushPriceSnapshot(price.id, snapshot, MAX_SNAPSHOT_POINTS)) stored += 1
          else errors.push('Redis not configured')
        } catch {
          errors.push(`Redis write failed for item ${price.id}`)
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'batch failed')
    }
  }

  res.status(200).json({
    ok: true,
    stored,
    tracked: tracked.length,
    core: uniqueTrackedIds(CORE_TRACKED_ITEM_IDS).length,
    dynamic: dynamicIds.length,
    redis: stored > 0,
    errors: [...new Set(errors)].slice(0, 5),
  })
}

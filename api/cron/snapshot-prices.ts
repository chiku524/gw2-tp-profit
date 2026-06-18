import { pushPriceSnapshot } from '../lib/redis.js'

/** Item IDs tracked by the server-side price snapshot cron. */
const SNAPSHOT_ITEM_IDS = [
  19759, 19700, 19722, 19748, 19701, 24277, 24282, 24288,
  89271, 89140, 89103, 89098, 97513, 97511,
  24615, 24633, 24609, 44950, 44956, 44957,
  66530, 66528, 66527, 75005, 86380, 86381,
  49432, 49434, 49428,
]

type Snapshot = { t: number; buy: number; sell: number }

const API_BASE = 'https://api.guildwars2.com/v2'
const BATCH = 200
const MAX_POINTS = 500

async function fetchPrices(
  ids: number[],
): Promise<{ id: number; buys: { unit_price: number }; sells: { unit_price: number } }[]> {
  const url = `${API_BASE}/commerce/prices?ids=${ids.join(',')}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`GW2 API HTTP ${response.status}`)
  const data = await response.json()
  return Array.isArray(data) ? data : [data]
}

export default async function handler(request: Request): Promise<Response> {
  const auth = request.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  let stored = 0
  const errors: string[] = []

  for (let index = 0; index < SNAPSHOT_ITEM_IDS.length; index += BATCH) {
    const batch = SNAPSHOT_ITEM_IDS.slice(index, index + BATCH)
    try {
      const prices = await fetchPrices(batch)
      for (const price of prices) {
        const snapshot: Snapshot = {
          t: Date.now(),
          buy: price.sells.unit_price,
          sell: price.buys.unit_price,
        }
        try {
          const ok = await pushPriceSnapshot(price.id, snapshot, MAX_POINTS)
          if (ok) stored += 1
          else errors.push('Redis not configured')
        } catch {
          errors.push(`Redis write failed for item ${price.id}`)
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'batch failed')
    }
  }

  return Response.json({
    ok: true,
    stored,
    tracked: SNAPSHOT_ITEM_IDS.length,
    redis: stored > 0,
    errors: [...new Set(errors)].slice(0, 5),
  })
}

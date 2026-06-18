import type { VercelRequest, VercelResponse } from '@vercel/node'

type Snapshot = { t: number; buy: number; sell: number }
type UpstashResult = { result?: unknown }

const SNAPSHOT_ITEM_IDS = [
  19759, 19700, 19722, 19748, 19701, 24277, 24282, 24288,
  89271, 89140, 89103, 89098, 97513, 97511,
  24615, 24633, 24609, 44950, 44956, 44957,
  66530, 66528, 66527, 75005, 86380, 86381,
  49432, 49434, 49428,
]

const API_BASE = 'https://api.guildwars2.com/v2'
const BATCH = 200
const MAX_POINTS = 500

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return { url: url.replace(/\/$/, ''), token }
}

async function upstashPipeline(commands: string[][]): Promise<UpstashResult[]> {
  const config = redisConfig()
  if (!config) throw new Error('Redis not configured')
  const response = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.token}` },
    body: JSON.stringify(commands),
  })
  if (!response.ok) throw new Error(`Upstash HTTP ${response.status}`)
  return (await response.json()) as UpstashResult[]
}

async function pushPriceSnapshot(itemId: number, snapshot: Snapshot): Promise<boolean> {
  if (!redisConfig()) return false
  const key = `price:${itemId}`
  await upstashPipeline([
    ['LPUSH', key, JSON.stringify(snapshot)],
    ['LTRIM', key, '0', String(MAX_POINTS - 1)],
  ])
  return true
}

async function fetchPrices(
  ids: number[],
): Promise<{ id: number; buys: { unit_price: number }; sells: { unit_price: number } }[]> {
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
          if (await pushPriceSnapshot(price.id, snapshot)) stored += 1
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
    tracked: SNAPSHOT_ITEM_IDS.length,
    redis: stored > 0,
    errors: [...new Set(errors)].slice(0, 5),
  })
}

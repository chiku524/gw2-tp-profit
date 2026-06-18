import { Redis } from '@upstash/redis'

type Snapshot = { t: number; buy: number; sell: number }

let client: Redis | null = null

export function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  client ??= new Redis({ url, token })
  return client
}

export async function pushPriceSnapshot(
  itemId: number,
  snapshot: Snapshot,
  maxPoints: number,
): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return false
  const key = `price:${itemId}`
  await redis.lpush(key, JSON.stringify(snapshot))
  await redis.ltrim(key, 0, maxPoints - 1)
  return true
}

export async function readPriceHistory(itemId: number, limit: number): Promise<Snapshot[]> {
  const redis = getRedis()
  if (!redis) return []

  const raw = await redis.lrange<string>(`price:${itemId}`, 0, limit)
  return raw
    .map((row) => {
      try {
        const parsed = typeof row === 'string' ? JSON.parse(row) : row
        return parsed as Snapshot
      } catch {
        return null
      }
    })
    .filter((row): row is Snapshot => row !== null && typeof row.t === 'number')
    .reverse()
}

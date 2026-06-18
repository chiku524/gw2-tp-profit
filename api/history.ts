import type { VercelRequest, VercelResponse } from '@vercel/node'

type Snapshot = { t: number; buy: number; sell: number }
type UpstashResult = { result?: unknown }

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

function parseSnapshot(row: unknown): Snapshot | null {
  if (row && typeof row === 'object' && 't' in row) {
    const snapshot = row as Snapshot
    return typeof snapshot.t === 'number' ? snapshot : null
  }
  if (typeof row === 'string') {
    try {
      const parsed = JSON.parse(row) as Snapshot
      return typeof parsed.t === 'number' ? parsed : null
    } catch {
      return null
    }
  }
  return null
}

async function readPriceHistory(itemId: number, limit: number): Promise<Snapshot[]> {
  if (!redisConfig()) return []
  const key = `price:${itemId}`
  const [result] = await upstashPipeline([['LRANGE', key, '0', String(limit)]])
  const rows = Array.isArray(result?.result) ? result.result : []
  return rows
    .map(parseSnapshot)
    .filter((row): row is Snapshot => row !== null)
    .reverse()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const itemId = typeof req.query.itemId === 'string' ? req.query.itemId : req.query.itemId?.[0]

  if (!itemId || !/^\d+$/.test(itemId)) {
    res.status(400).json({ error: 'Invalid item id' })
    return
  }

  try {
    const history = await readPriceHistory(Number(itemId), 200)
    res.status(200).json(history)
  } catch {
    res.status(200).json([])
  }
}

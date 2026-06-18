type Snapshot = { t: number; buy: number; sell: number }

type UpstashResult = { result?: unknown; error?: string }

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

  if (!response.ok) {
    throw new Error(`Upstash HTTP ${response.status}`)
  }

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

export async function pushPriceSnapshot(
  itemId: number,
  snapshot: Snapshot,
  maxPoints: number,
): Promise<boolean> {
  if (!redisConfig()) return false

  const key = `price:${itemId}`
  const payload = JSON.stringify(snapshot)
  await upstashPipeline([
    ['LPUSH', key, payload],
    ['LTRIM', key, '0', String(maxPoints - 1)],
  ])
  return true
}

export async function readPriceHistory(itemId: number, limit: number): Promise<Snapshot[]> {
  if (!redisConfig()) return []

  const key = `price:${itemId}`
  const [result] = await upstashPipeline([['LRANGE', key, '0', String(limit)]])
  const rows = Array.isArray(result?.result) ? result.result : []
  return rows
    .map(parseSnapshot)
    .filter((row): row is Snapshot => row !== null)
    .reverse()
}

export function getRedisConfigured(): boolean {
  return redisConfig() !== null
}

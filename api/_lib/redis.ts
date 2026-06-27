type UpstashResult = { result?: unknown }

export type Snapshot = { t: number; buy: number; sell: number }

export function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return { url: url.replace(/\/$/, ''), token }
}

export async function upstashPipeline(commands: string[][]): Promise<UpstashResult[]> {
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

export function parseSnapshot(row: unknown): Snapshot | null {
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

const TRACKED_ZSET = 'tracked:items'

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

export async function pushPriceSnapshot(itemId: number, snapshot: Snapshot, maxPoints: number): Promise<boolean> {
  if (!redisConfig()) return false
  const key = `price:${itemId}`
  await upstashPipeline([
    ['LPUSH', key, JSON.stringify(snapshot)],
    ['LTRIM', key, '0', String(maxPoints - 1)],
  ])
  return true
}

export async function registerTrackedItems(itemIds: number[], maxDynamic: number): Promise<boolean> {
  if (!redisConfig() || itemIds.length === 0) return false
  const now = Date.now()
  const commands: string[][] = itemIds.map((id) => ['ZADD', TRACKED_ZSET, String(now), String(id)])
  commands.push(['ZREMRANGEBYRANK', TRACKED_ZSET, '0', String(-(maxDynamic + 1))])
  await upstashPipeline(commands)
  return true
}

export async function readDynamicTrackedIds(max: number): Promise<number[]> {
  if (!redisConfig()) return []
  const [result] = await upstashPipeline([['ZREVRANGE', TRACKED_ZSET, '0', String(max - 1)]])
  const rows = Array.isArray(result?.result) ? result.result : []
  return rows.map((row) => Number(row)).filter((id) => Number.isFinite(id) && id > 0)
}

export function mergeSnapshots(local: Snapshot[], remote: Snapshot[]): Snapshot[] {
  const byTime = new Map<number, Snapshot>()
  for (const row of [...local, ...remote]) {
    if (!row?.t) continue
    byTime.set(row.t, row)
  }
  return [...byTime.values()].sort((a, b) => a.t - b.t)
}

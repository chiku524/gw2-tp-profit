import { kv } from '@vercel/kv'

type Snapshot = { t: number; buy: number; sell: number }

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const parts = url.pathname.split('/')
  const itemId = parts[parts.length - 1]

  if (!itemId || !/^\d+$/.test(itemId)) {
    return Response.json({ error: 'Invalid item id' }, { status: 400 })
  }

  try {
    const raw = await kv.lrange(`price:${itemId}`, 0, 200)
    const history = raw
      .map((row) => {
        try {
          return JSON.parse(String(row)) as Snapshot
        } catch {
          return null
        }
      })
      .filter((row): row is Snapshot => row !== null && typeof row.t === 'number')
      .reverse()
    return Response.json(history)
  } catch {
    return Response.json([])
  }
}

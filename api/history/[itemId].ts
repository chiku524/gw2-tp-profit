import { readPriceHistory } from '../lib/redis'

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const parts = url.pathname.split('/')
  const itemId = parts[parts.length - 1]

  if (!itemId || !/^\d+$/.test(itemId)) {
    return Response.json({ error: 'Invalid item id' }, { status: 400 })
  }

  try {
    const history = await readPriceHistory(Number(itemId), 200)
    return Response.json(history)
  } catch {
    return Response.json([])
  }
}

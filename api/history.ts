import { readPriceHistory } from './_lib/redis'

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const itemId = url.searchParams.get('itemId')

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

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readPriceHistory } from '../server/upstash'

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

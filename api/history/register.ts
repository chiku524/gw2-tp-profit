import type { VercelRequest, VercelResponse } from '@vercel/node'
import { registerTrackedItems } from '../_lib/redis.js'
import { MAX_DYNAMIC_TRACKED, uniqueTrackedIds } from '../_lib/trackedItems.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const body = req.body as { itemIds?: number[]; itemId?: number }
  const ids = uniqueTrackedIds([
    ...(Array.isArray(body?.itemIds) ? body.itemIds : []),
    ...(typeof body?.itemId === 'number' ? [body.itemId] : []),
  ])

  if (ids.length === 0) {
    res.status(400).json({ error: 'No item ids provided' })
    return
  }

  try {
    const ok = await registerTrackedItems(ids, MAX_DYNAMIC_TRACKED)
    res.status(200).json({ ok, registered: ids.length })
  } catch {
    res.status(200).json({ ok: false, registered: 0 })
  }
}

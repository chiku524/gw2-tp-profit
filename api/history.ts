import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  mergeSnapshots,
  parseSnapshot,
  pushPriceSnapshot,
  readPriceHistory,
  registerTrackedItems,
  type Snapshot,
} from './_lib/redis.js'
import { MAX_DYNAMIC_TRACKED, MAX_SNAPSHOT_POINTS } from './_lib/trackedItems.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const itemIdRaw =
    typeof req.query.itemId === 'string' ? req.query.itemId : req.query.itemId?.[0]

  if (!itemIdRaw || !/^\d+$/.test(itemIdRaw)) {
    res.status(400).json({ error: 'Invalid item id' })
    return
  }

  const itemId = Number(itemIdRaw)

  if (req.method === 'POST') {
    const body = req.body as Partial<Snapshot> & { snapshots?: Snapshot[] }
    const snapshots: Snapshot[] = []

    if (Array.isArray(body?.snapshots)) {
      for (const row of body.snapshots) {
        const parsed = parseSnapshot(row)
        if (parsed) snapshots.push(parsed)
      }
    } else if (body && typeof body.t === 'number') {
      const parsed = parseSnapshot(body)
      if (parsed) snapshots.push(parsed)
    }

    if (snapshots.length === 0) {
      res.status(400).json({ error: 'No valid snapshots' })
      return
    }

    try {
      let stored = 0
      for (const snapshot of snapshots.slice(-5)) {
        if (await pushPriceSnapshot(itemId, snapshot, MAX_SNAPSHOT_POINTS)) stored += 1
      }
      await registerTrackedItems([itemId], MAX_DYNAMIC_TRACKED)
      res.status(200).json({ ok: true, stored })
    } catch {
      res.status(200).json({ ok: false, stored: 0 })
    }
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const remote = await readPriceHistory(itemId, 500)
    const localParam = typeof req.query.local === 'string' ? req.query.local : req.query.local?.[0]
    let local: Snapshot[] = []
    if (localParam) {
      try {
        local = JSON.parse(decodeURIComponent(localParam)) as Snapshot[]
      } catch {
        local = []
      }
    }

    const history = local.length > 0 ? mergeSnapshots(local, remote) : remote
    res.status(200).json(history.slice(-500))
  } catch {
    res.status(200).json([])
  }
}

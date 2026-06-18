import type { FlipOpportunity } from '../types'

export function exportFlipsToCsv(rows: FlipOpportunity[]): void {
  const header = [
    'item_id',
    'item_name',
    'buy_price',
    'sell_price',
    'instant_profit',
    'roi_pct',
    'spread_pct',
    'buy_volume',
    'sell_volume',
    'listing_profit',
  ]

  const lines = rows.map((row) =>
    [
      row.itemId,
      `"${row.itemName.replace(/"/g, '""')}"`,
      row.buyPrice,
      row.sellPrice,
      row.instantProfit,
      row.instantRoi.toFixed(2),
      (row.spreadPct ?? 0).toFixed(2),
      row.buyVolume,
      row.sellVolume,
      row.listingProfit,
    ].join(','),
  )

  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `gw2-tp-flips-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

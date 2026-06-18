const GOLD = 10_000
const SILVER = 100

export function formatCoins(copper: number): string {
  if (!Number.isFinite(copper) || copper <= 0) return '0c'

  const gold = Math.floor(copper / GOLD)
  const silver = Math.floor((copper % GOLD) / SILVER)
  const c = Math.floor(copper % SILVER)

  const parts: string[] = []
  if (gold > 0) parts.push(`${gold}g`)
  if (silver > 0 || gold > 0) parts.push(`${silver}s`)
  if (c > 0 || parts.length === 0) parts.push(`${c}c`)
  return parts.join(' ')
}

export function parseCoinsInput(value: string): number | null {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return null

  const goldMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*g/)
  const silverMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*s/)
  const copperMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*c/)

  if (!goldMatch && !silverMatch && !copperMatch) {
    const plain = Number(trimmed.replace(/,/g, ''))
    return Number.isFinite(plain) ? Math.round(plain) : null
  }

  const gold = goldMatch ? Number(goldMatch[1]) : 0
  const silver = silverMatch ? Number(silverMatch[1]) : 0
  const copper = copperMatch ? Number(copperMatch[1]) : 0
  return Math.round(gold * GOLD + silver * SILVER + copper)
}

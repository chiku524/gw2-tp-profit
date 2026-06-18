import type { FlipJournalEntry } from '../types'

const STORAGE_KEY = 'gw2-tp-flip-journal'

export function loadFlipJournal(): FlipJournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as FlipJournalEntry[]
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.createdAt - a.createdAt) : []
  } catch {
    return []
  }
}

export function saveFlipJournal(entries: FlipJournalEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function addJournalEntry(
  entry: Omit<FlipJournalEntry, 'id' | 'createdAt'>,
): FlipJournalEntry[] {
  const rows = loadFlipJournal()
  const row: FlipJournalEntry = { ...entry, id: crypto.randomUUID(), createdAt: Date.now() }
  rows.unshift(row)
  saveFlipJournal(rows.slice(0, 200))
  return rows
}

export function removeJournalEntry(id: string): FlipJournalEntry[] {
  const rows = loadFlipJournal().filter((row) => row.id !== id)
  saveFlipJournal(rows)
  return rows
}

export const JOURNAL_TAGS = ['material', 'craft', 'slow', 'event', 'flip', 'investment'] as const

import { useState } from 'react'
import { useItemDetail } from '../../context/ItemDetailProvider'
import {
  addJournalEntry,
  JOURNAL_TAGS,
  loadFlipJournal,
  removeJournalEntry,
} from '../../lib/flipJournal'
import type { FlipJournalEntry } from '../../types'

export function FlipJournalPanel() {
  const { openItem } = useItemDetail()
  const [entries, setEntries] = useState<FlipJournalEntry[]>(() => loadFlipJournal())
  const [itemId, setItemId] = useState('')
  const [itemName, setItemName] = useState('')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState<string[]>(['flip'])
  const [filterTag, setFilterTag] = useState<string | null>(null)

  const save = () => {
    const id = Number(itemId)
    if (!id || !itemName.trim()) return
    setEntries(
      addJournalEntry({
        itemId: id,
        itemName: itemName.trim(),
        note: note.trim(),
        tags,
      }),
    )
    setItemId('')
    setItemName('')
    setNote('')
  }

  const toggleTag = (tag: string) => {
    setTags((current) => (current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]))
  }

  const visible = filterTag ? entries.filter((row) => row.tags.includes(filterTag)) : entries

  return (
    <section className="panel nested-panel">
      <h3>Flip journal</h3>
      <p className="hint">Log what you tried, tag strategies, and review what actually made gold.</p>

      <div className="filters">
        <div className="field">
          <label htmlFor="journal-item-id">Item ID</label>
          <input id="journal-item-id" type="number" value={itemId} onChange={(event) => setItemId(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="journal-item-name">Item name</label>
          <input id="journal-item-name" value={itemName} onChange={(event) => setItemName(event.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="journal-note">Note</label>
        <input id="journal-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Bought 250 @ 12s, listed 14s…" />
      </div>

      <div className="chip-row">
        {JOURNAL_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            className={`chip-btn ${tags.includes(tag) ? 'active' : ''}`}
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      <button type="button" className="secondary" onClick={save}>
        Add entry
      </button>

      <div className="chip-row">
        <button type="button" className={`chip-btn ${filterTag === null ? 'active' : ''}`} onClick={() => setFilterTag(null)}>
          All
        </button>
        {JOURNAL_TAGS.map((tag) => (
          <button
            key={`filter-${tag}`}
            type="button"
            className={`chip-btn ${filterTag === tag ? 'active' : ''}`}
            onClick={() => setFilterTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="empty-state">No journal entries yet.</p>
      ) : (
        <ul className="journal-list">
          {visible.map((entry) => (
            <li key={entry.id}>
              <button type="button" className="row-link" onClick={() => openItem({ id: entry.itemId, name: entry.itemName })}>
                <strong>{entry.itemName}</strong>
              </button>
              <p>{entry.note || '—'}</p>
              <div className="chip-row compact">
                {entry.tags.map((tag) => (
                  <span key={tag} className="badge subtle">
                    {tag}
                  </span>
                ))}
              </div>
              <button type="button" className="icon-btn" onClick={() => setEntries(removeJournalEntry(entry.id))}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

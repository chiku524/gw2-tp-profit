import { useEffect, useState } from 'react'
import { useItemDetail } from '../../context/ItemDetailProvider'
import { searchItems } from '../../lib/gw2Api'

export function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: number; name: string; icon?: string }[]>([])
  const [focused, setFocused] = useState(false)
  const { openItem } = useItemDetail()

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const timer = window.setTimeout(async () => {
      try {
        const items = await searchItems(query)
        setResults(items.slice(0, 6))
      } catch {
        setResults([])
      }
    }, 200)
    return () => window.clearTimeout(timer)
  }, [query])

  const showDropdown = focused && (results.length > 0 || query.trim().length >= 2)

  return (
    <div className="global-search">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 150)}
        placeholder="Search trading post…  (Ctrl+K)"
        aria-label="Search items"
      />
      {showDropdown ? (
        <ul className="global-search-results">
          {results.length === 0 ? (
            <li className="hint">No items found</li>
          ) : (
            results.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    openItem(item)
                    setQuery('')
                    setFocused(false)
                  }}
                >
                  {item.icon ? <img src={item.icon} alt="" width={22} height={22} /> : null}
                  {item.name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}

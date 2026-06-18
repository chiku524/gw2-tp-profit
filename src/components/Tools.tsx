import { useEffect, useState } from 'react'
import { fetchCommercePrice, searchItems } from '../lib/gw2Api'
import { formatCoins, parseCoinsInput } from '../lib/coins'
import { instantFlipProfit, listingFlipProfit, LISTING_FEE_RATE, EXCHANGE_FEE_RATE } from '../lib/profit'
import type { CommercePrice, Gw2Item } from '../types'

export function ItemLookup() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Gw2Item[]>([])
  const [selected, setSelected] = useState<Gw2Item | null>(null)
  const [price, setPrice] = useState<CommercePrice | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }

    const timer = window.setTimeout(async () => {
      try {
        const items = await searchItems(query)
        setResults(items.slice(0, 12))
      } catch {
        setResults([])
      }
    }, 250)

    return () => window.clearTimeout(timer)
  }, [query])

  const loadItem = async (item: Gw2Item) => {
    setSelected(item)
    setQuery(item.name)
    setResults([])
    setLoading(true)
    setError(null)

    try {
      const commerce = await fetchCommercePrice(item.id)
      setPrice(commerce)
    } catch (err) {
      setPrice(null)
      setError(err instanceof Error ? err.message : 'Failed to load price')
    } finally {
      setLoading(false)
    }
  }

  const buyPrice = price?.sells.unit_price ?? 0
  const sellPrice = price?.buys.unit_price ?? 0
  const instantProfit = instantFlipProfit(buyPrice, sellPrice)
  const listingProfit = listingFlipProfit(buyPrice, sellPrice)

  return (
    <section className="panel">
      <div className="field">
        <label htmlFor="item-search">Search item</label>
        <input
          id="item-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. Glob of Ectoplasm"
        />
      </div>

      {results.length > 0 ? (
        <ul className="search-results">
          {results.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => void loadItem(item)}>
                {item.icon ? <img src={item.icon} alt="" width={24} height={24} /> : null}
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {loading ? <p className="status">Loading trading post data…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {selected && price ? (
        <div className="item-detail">
          <header>
            {selected.icon ? <img src={selected.icon} alt="" width={48} height={48} /> : null}
            <div>
              <h3>{selected.name}</h3>
              <p>Item ID {selected.id}</p>
            </div>
          </header>

          <div className="stat-grid">
            <div>
              <span>Lowest sell (you buy)</span>
              <strong>{formatCoins(buyPrice)}</strong>
              <small>{price.sells.quantity} available</small>
            </div>
            <div>
              <span>Highest buy (you sell)</span>
              <strong>{formatCoins(sellPrice)}</strong>
              <small>{price.buys.quantity} demanded</small>
            </div>
            <div>
              <span>Instant flip profit</span>
              <strong className={instantProfit > 0 ? 'profit' : 'loss'}>{formatCoins(instantProfit)}</strong>
            </div>
            <div>
              <span>List at buy price (after fees)</span>
              <strong className={listingProfit > 0 ? 'profit' : 'loss'}>{formatCoins(listingProfit)}</strong>
              <small>
                {Math.round(LISTING_FEE_RATE * 100)}% listing + {Math.round(EXCHANGE_FEE_RATE * 100)}% sale tax
              </small>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export function ProfitCalculator() {
  const [buyInput, setBuyInput] = useState('1g')
  const [sellInput, setSellInput] = useState('1g 20s')
  const [mode, setMode] = useState<'instant' | 'listing'>('instant')

  const buyPrice = parseCoinsInput(buyInput) ?? 0
  const sellPrice = parseCoinsInput(sellInput) ?? 0
  const profit =
    mode === 'instant'
      ? instantFlipProfit(buyPrice, sellPrice)
      : listingFlipProfit(buyPrice, sellPrice)

  return (
    <section className="panel">
      <div className="mode-toggle">
        <button type="button" className={mode === 'instant' ? 'active' : ''} onClick={() => setMode('instant')}>
          Instant flip
        </button>
        <button type="button" className={mode === 'listing' ? 'active' : ''} onClick={() => setMode('listing')}>
          Listing flip
        </button>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="buy-price">Buy price</label>
          <input id="buy-price" value={buyInput} onChange={(event) => setBuyInput(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="sell-price">{mode === 'instant' ? 'Sell to buy order' : 'List price'}</label>
          <input id="sell-price" value={sellInput} onChange={(event) => setSellInput(event.target.value)} />
        </div>
      </div>

      <div className="calculator-result">
        <span>Net profit per unit</span>
        <strong className={profit >= 0 ? 'profit' : 'loss'}>{formatCoins(profit)}</strong>
        {buyPrice > 0 ? <small>{((profit / buyPrice) * 100).toFixed(1)}% ROI</small> : null}
      </div>

      <p className="hint">
        {mode === 'instant'
          ? 'Instant flips buy from the lowest sell listing and sell to the highest buy order with no listing fees.'
          : 'Listing flips include a 5% listing fee and 10% sale tax on the listed price.'}
      </p>
    </section>
  )
}

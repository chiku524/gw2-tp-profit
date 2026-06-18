import { useCallback, useEffect, useRef, useState } from 'react'
import { useApiKey } from '../../context/ApiKeyProvider'
import { PermissionHint } from '../PermissionGate'
import { useCraftingContext } from '../../hooks/useCraftingContext'
import { formatCoins } from '../../lib/coins'
import { calculateCraftingProfits } from '../../lib/crafting'
import { craftingLevelSummary } from '../../lib/recipeAccess'
import { searchItems } from '../../lib/gw2Api'
import type { CraftingResult, Gw2Item } from '../../types'

type Props = {
  preloadItem?: Gw2Item | null
  onPreloadConsumed?: () => void
}

export function CraftingPanel({ preloadItem, onPreloadConsumed }: Props) {
  const { apiKey, canUse } = useApiKey()
  const { context: craftingContext } = useCraftingContext()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Gw2Item[]>([])
  const [selected, setSelected] = useState<Gw2Item | null>(null)
  const [craftResults, setCraftResults] = useState<CraftingResult[]>([])
  const [useBank, setUseBank] = useState(true)
  const [onlyKnownRecipes, setOnlyKnownRecipes] = useState(false)
  const [onlyCraftableLevel, setOnlyCraftableLevel] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastPreloadId = useRef<number | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }

    const timer = window.setTimeout(async () => {
      try {
        const items = await searchItems(query)
        setResults(items.slice(0, 10))
      } catch {
        setResults([])
      }
    }, 250)

    return () => window.clearTimeout(timer)
  }, [query])

  const analyze = useCallback(
    async (item: Gw2Item) => {
      setSelected(item)
      setQuery(item.name)
      setResults([])
      setLoading(true)
      setError(null)

      try {
        const profits = await calculateCraftingProfits(item.id, item.name, item.icon, apiKey || null, {
          useBank: useBank && canUse('craftingBank'),
          onlyKnownRecipes: onlyKnownRecipes && canUse('recipeUnlocks'),
          onlyCraftableLevel: onlyCraftableLevel && canUse('craftingLevels'),
          craftingContext,
        })
        setCraftResults(profits)
        if (profits.length === 0) {
          setError(
            onlyKnownRecipes || onlyCraftableLevel
              ? 'No craftable recipes match your filters. Try disabling recipe or level filters.'
              : 'No craftable recipes found for this item on the trading post.',
          )
        }
      } catch (err) {
        setCraftResults([])
        setError(err instanceof Error ? err.message : 'Crafting analysis failed')
      } finally {
        setLoading(false)
      }
    },
    [apiKey, canUse, useBank, onlyKnownRecipes, onlyCraftableLevel, craftingContext],
  )

  useEffect(() => {
    if (!preloadItem || preloadItem.id === lastPreloadId.current) return
    lastPreloadId.current = preloadItem.id
    void analyze(preloadItem)
    onPreloadConsumed?.()
  }, [preloadItem, onPreloadConsumed, analyze])

  const levelSummary = craftingLevelSummary(craftingContext)

  return (
    <section className="panel">
      <h2>Crafting profit</h2>
      <p className="hint">
        Uses gw2efficiency&apos;s recipe engine to find the cheapest craft tree, then compares cost to current
        trading post prices. Vendor prices and daily cooldowns are included automatically.
      </p>

      {levelSummary ? (
        <p className="hint">Your highest crafting levels: {levelSummary}</p>
      ) : null}

      <div className="field">
        <label htmlFor="craft-search">Craftable item</label>
        <input
          id="craft-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. Bolt of Linen"
        />
      </div>

      <div className="craft-options">
        {canUse('craftingBank') ? (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={useBank}
              onChange={(event) => setUseBank(event.target.checked)}
            />
            Subtract bank &amp; material storage
          </label>
        ) : (
          <PermissionHint feature="craftingBank" compact />
        )}

        {canUse('recipeUnlocks') ? (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={onlyKnownRecipes}
              onChange={(event) => setOnlyKnownRecipes(event.target.checked)}
            />
            Only recipes I&apos;ve discovered
          </label>
        ) : (
          <PermissionHint feature="recipeUnlocks" compact />
        )}

        {canUse('craftingLevels') ? (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={onlyCraftableLevel}
              onChange={(event) => setOnlyCraftableLevel(event.target.checked)}
            />
            Only recipes my characters can craft
          </label>
        ) : (
          <PermissionHint feature="craftingLevels" compact />
        )}
      </div>

      {results.length > 0 ? (
        <ul className="search-results">
          {results.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => void analyze(item)}>
                {item.icon ? <img src={item.icon} alt="" width={24} height={24} /> : null}
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {loading ? <p className="status">Calculating cheapest craft tree…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {selected && craftResults.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Recipe</th>
                <th>Discipline</th>
                <th>Craft cost</th>
                <th>TP sell value</th>
                <th>Instant profit</th>
                <th>Listing profit</th>
              </tr>
            </thead>
            <tbody>
              {craftResults.map((row) => (
                <tr key={row.recipeId}>
                  <td className="item-cell">
                    {row.icon ? <img src={row.icon} alt="" width={28} height={28} /> : null}
                    <span>{row.outputItemName}</span>
                  </td>
                  <td>{row.disciplines.join(', ') || '—'}</td>
                  <td>{formatCoins(row.craftCost)}</td>
                  <td>{formatCoins(row.sellRevenue)}</td>
                  <td className={row.instantProfit > 0 ? 'profit' : 'loss'}>
                    {formatCoins(row.instantProfit)}
                  </td>
                  <td className={row.listingProfit > 0 ? 'profit' : 'loss'}>
                    {formatCoins(row.listingProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}

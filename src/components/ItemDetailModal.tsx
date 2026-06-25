import { useCallback, useEffect, useMemo, useState } from 'react'
import { useItemDetail } from '../context/ItemDetailProvider'
import { useWatchlist } from '../context/WatchlistProvider'
import { copyText } from '../lib/clipboard'
import { formatCoins } from '../lib/coins'
import {
  fetchCommerceListings,
  fetchCommercePrice,
  fetchItem,
} from '../lib/gw2Api'
import {
  maxFlipQuantity,
  spreadPercent,
  stackInstantProfit,
  stackListingProfit,
  suggestInstantSell,
  suggestOutbidBuy,
  suggestUndercutSell,
} from '../lib/marketMath'
import { fetchPriceHistory, recordPriceSnapshot, type PriceSnapshot } from '../lib/priceHistory'
import { computePriceSignals } from '../lib/priceSignals'
import { addJournalEntry } from '../lib/flipJournal'
import { loadProfitMovesCache } from '../lib/preferences'
import { formatProfitMoveInputs, kindLabel } from '../lib/profitMoves'
import {
  instantFlipProfit,
  spreadListingFlipProfit,
  resolveFlipSellStrategy,
  LISTING_FEE_RATE,
  EXCHANGE_FEE_RATE,
} from '../lib/profit'
import type { CommerceListings, CommercePrice, Gw2Item } from '../types'
import { OrderBook } from './OrderBook'
import { PriceHistoryChart } from './PriceHistoryChart'

type Props = {
  onOpenCrafting?: (item: Gw2Item) => void
  onGoCrafts?: () => void
}

export function ItemDetailModal({ onOpenCrafting, onGoCrafts }: Props) {
  const { item, closeItem } = useItemDetail()
  const { isWatched, toggle } = useWatchlist()
  const [details, setDetails] = useState<Gw2Item | null>(null)
  const [price, setPrice] = useState<CommercePrice | null>(null)
  const [listings, setListings] = useState<CommerceListings | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [history, setHistory] = useState<PriceSnapshot[]>([])
  const [signals, setSignals] = useState<ReturnType<typeof computePriceSignals>>([])

  const loadData = useCallback(async () => {
    if (!item) return
    setLoading(true)
    setError(null)
    setQuantity(1)

    try {
      const [itemDetails, commerce, orderBook] = await Promise.all([
        item.name.startsWith('Item ') ? fetchItem(item.id) : Promise.resolve(item),
        fetchCommercePrice(item.id),
        fetchCommerceListings(item.id),
      ])
      setDetails(itemDetails)
      setPrice(commerce)
      recordPriceSnapshot(commerce)
      setListings(orderBook)
      const priceHistory = await fetchPriceHistory(item.id)
      setHistory(priceHistory)
      setSignals(computePriceSignals(priceHistory))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load item')
    } finally {
      setLoading(false)
    }
  }, [item])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const copyPrice = async (label: string, copper: number) => {
    const ok = await copyText(String(copper))
    if (ok) {
      setCopied(label)
      window.setTimeout(() => setCopied(null), 1500)
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeItem()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeItem])

  const profitMove = useMemo(() => {
    if (!item) return null
    const cached = loadProfitMovesCache()?.moves ?? []
    const asOutput = cached.find((move) => move.outputItemId === item.id)
    if (asOutput) return asOutput
    return cached.find((move) => move.inputs.some((input) => input.itemId === item.id)) ?? null
  }, [item?.id])

  if (!item) return null

  const display = details ?? item
  const buyPrice = price?.sells.unit_price ?? 0
  const sellPrice = price?.buys.unit_price ?? 0
  const sellStrategy = resolveFlipSellStrategy(buyPrice, sellPrice, display.type)
  const instantProfit = instantFlipProfit(buyPrice, sellPrice)
  const listingProfit = spreadListingFlipProfit(buyPrice, sellPrice, sellStrategy)
  const spread = spreadPercent(buyPrice, sellPrice)
  const maxQty = price ? maxFlipQuantity(price.sells.quantity, price.buys.quantity) : 0

  return (
    <div className="modal-backdrop" onClick={closeItem} role="presentation">
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={display.name}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div className="item-cell">
            {display.icon ? <img src={display.icon} alt="" width={48} height={48} /> : null}
            <div>
              <h2>{display.name}</h2>
              <p className="hint">
                {display.type ? `${display.type} · ` : ''}ID {display.id}
                {display.rarity ? ` · ${display.rarity}` : ''}
              </p>
            </div>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className={isWatched(display.id) ? 'icon-btn active' : 'icon-btn'}
              onClick={() =>
                toggle({ itemId: display.id, name: display.name, icon: display.icon })
              }
              title={isWatched(display.id) ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              {isWatched(display.id) ? '★' : '☆'}
            </button>
            {onOpenCrafting ? (
              <button
                type="button"
                className="secondary compact-btn"
                onClick={() => {
                  onOpenCrafting(display)
                  closeItem()
                }}
              >
                Craft profit
              </button>
            ) : null}
            <button
              type="button"
              className="secondary compact-btn"
              onClick={() => {
                addJournalEntry({
                  itemId: display.id,
                  itemName: display.name,
                  note: `Listed flip check @ ${formatCoins(buyPrice)} buy / ${formatCoins(sellPrice)} sell`,
                  tags: ['flip'],
                })
              }}
              title="Log to flip journal"
            >
              Log flip
            </button>
            <button type="button" className="icon-btn" onClick={() => void loadData()} title="Refresh prices">
              ↻
            </button>
            <button type="button" className="icon-btn" onClick={closeItem} aria-label="Close">
              ✕
            </button>
          </div>
        </header>

        {loading ? <p className="status">Loading market depth…</p> : null}
        {error ? <p className="error">{error}</p> : null}

        {price ? (
          <>
            <div className="stat-grid">
              <div>
                <span>Lowest sell</span>
                <strong>{formatCoins(buyPrice)}</strong>
                <small>{price.sells.quantity} listed</small>
              </div>
              <div>
                <span>Highest buy</span>
                <strong>{formatCoins(sellPrice)}</strong>
                <small>{price.buys.quantity} demanded</small>
              </div>
              <div>
                <span>Spread gap</span>
                <strong className={spread > 0 ? 'profit' : 'loss'}>{spread.toFixed(1)}%</strong>
                <small>{formatCoins(sellPrice - buyPrice)} between top buy &amp; lowest sell</small>
              </div>
              <div>
                <span>Listing flip (est.)</span>
                <strong className={listingProfit > 0 ? 'profit' : 'loss'}>
                  {formatCoins(listingProfit)}
                </strong>
                <small>
                  {sellStrategy === 'sell-to-buy-order'
                    ? 'Outbid top buy (+1c), then sell to highest buy order (no listing fees)'
                    : `${Math.round(LISTING_FEE_RATE * 100)}% + ${Math.round(EXCHANGE_FEE_RATE * 100)}% fees`}
                </small>
              </div>
            </div>

            {profitMove ? (
              <section className="profit-move-teaser">
                <h3>Profitable combine</h3>
                <p className="hint">
                  <span className={`badge subtle kind-${profitMove.kind}`}>{kindLabel(profitMove.kind)}</span>{' '}
                  {formatProfitMoveInputs(profitMove)} →{' '}
                  {profitMove.outputCount > 1 ? `${profitMove.outputCount}× ` : ''}
                  {profitMove.outputItemName}
                </p>
                <p>
                  Est. profit per craft:{' '}
                  <strong className="profit">{formatCoins(profitMove.listingProfit)}</strong>
                  {onGoCrafts ? (
                    <>
                      {' '}
                      ·{' '}
                      <button type="button" className="link-button" onClick={onGoCrafts}>
                        View all crafts
                      </button>
                    </>
                  ) : null}
                </p>
              </section>
            ) : null}

            <section className="suggest-row">
              <h3>Suggested prices</h3>
              <div className="chip-row">
                <button type="button" className="chip copy-chip" onClick={() => void copyPrice('undercut', suggestUndercutSell(buyPrice))}>
                  Undercut sell: <strong>{formatCoins(suggestUndercutSell(buyPrice))}</strong>
                </button>
                <button type="button" className="chip copy-chip" onClick={() => void copyPrice('instant', suggestInstantSell(sellPrice))}>
                  Instant sell: <strong>{formatCoins(suggestInstantSell(sellPrice))}</strong>
                </button>
                <button type="button" className="chip copy-chip" onClick={() => void copyPrice('bid', suggestOutbidBuy(sellPrice))}>
                  Top buy bid: <strong>{formatCoins(suggestOutbidBuy(sellPrice))}</strong>
                </button>
                {display.chat_link ? (
                  <button type="button" className="chip copy-chip" onClick={() => void copyText(display.chat_link!)}>
                    Copy chat link
                  </button>
                ) : null}
              </div>
              {copied ? <p className="status">Copied {copied} price (copper)</p> : null}
            </section>

            <section>
              <h3>Price trend</h3>
              {signals.length > 0 ? (
                <ul className="signal-list">
                  {signals.map((signal) => (
                    <li key={signal.kind} className={`signal-${signal.strength}`}>
                      {signal.label}
                    </li>
                  ))}
                </ul>
              ) : null}
              <PriceHistoryChart history={history} />
            </section>

            <section className="stack-calc">
              <div className="stack-header">
                <h3>Stack profit</h3>
                <span className="hint">Max flip volume: {maxQty.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={1}
                max={Math.max(1, Math.min(maxQty || 250, 250))}
                value={Math.min(quantity, Math.max(1, Math.min(maxQty || 250, 250)))}
                onChange={(event) => setQuantity(Number(event.target.value))}
              />
              <div className="stack-values">
                <span>Qty: {quantity}</span>
                <span>
                  Instant:{' '}
                  <strong className={instantProfit >= 0 ? 'profit' : 'loss'}>
                    {formatCoins(stackInstantProfit(instantProfit, quantity))}
                  </strong>
                </span>
                <span>
                  Listing:{' '}
                  <strong className={listingProfit >= 0 ? 'profit' : 'loss'}>
                    {formatCoins(stackListingProfit(buyPrice, sellPrice, quantity, sellStrategy))}
                  </strong>
                </span>
              </div>
            </section>

            {listings ? <OrderBook listings={listings} compact /> : null}
          </>
        ) : null}
      </div>
    </div>
  )
}

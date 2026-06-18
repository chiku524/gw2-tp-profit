import { useEffect, useState } from 'react'
import { fetchGemExchange } from '../lib/gw2Api'
import { formatCoins } from '../lib/coins'
import { gemTimingAdvice, getGemHistory, recordGemExchange } from '../lib/gemHistory'
import type { GemExchange } from '../types'

export function GemExchangePanel() {
  const [gems, setGems] = useState<GemExchange[]>([])
  const [history, setHistory] = useState(() => getGemHistory())

  useEffect(() => {
    void fetchGemExchange()
      .then((entries) => {
        setGems(entries)
        recordGemExchange(entries)
        setHistory(getGemHistory())
      })
      .catch(() => setGems([]))
  }, [])

  const best = gems[0]
  const advice = gemTimingAdvice(history, best)

  return (
    <section className="panel gem-panel">
      <h3>Gem exchange timing</h3>
      <div className="stat-grid">
        <div>
          <span>Current rate</span>
          <strong>{best ? formatCoins(best.coins_per_gem) : '—'}</strong>
          <small>per gem</small>
        </div>
        {history.length > 0 ? (
          <>
            <div>
              <span>Recent low</span>
              <strong>{formatCoins(Math.min(...history.map((row) => row.coinsPerGem)))}</strong>
            </div>
            <div>
              <span>Recent high</span>
              <strong>{formatCoins(Math.max(...history.map((row) => row.coinsPerGem)))}</strong>
            </div>
          </>
        ) : null}
      </div>
      <p className="hint">{advice}</p>
      {history.length > 1 ? (
        <div className="gem-sparkline" aria-hidden>
          {history.slice(-30).map((row) => {
            const min = Math.min(...history.map((entry) => entry.coinsPerGem))
            const max = Math.max(...history.map((entry) => entry.coinsPerGem))
            const range = Math.max(1, max - min)
            const height = ((row.coinsPerGem - min) / range) * 100
            return <span key={row.t} style={{ height: `${Math.max(8, height)}%` }} />
          })}
        </div>
      ) : null}
    </section>
  )
}

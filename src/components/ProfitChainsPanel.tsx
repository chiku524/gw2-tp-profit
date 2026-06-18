import { useState } from 'react'
import { useItemDetail } from '../context/ItemDetailProvider'
import { formatCoins } from '../lib/coins'
import { findProfitChains } from '../lib/profitChains'
import { defaultProfitMoveFilters } from '../lib/profitMoves'
import type { ProfitChain } from '../types'

export function ProfitChainsPanel() {
  const { openItem } = useItemDetail()
  const [chains, setChains] = useState<ProfitChain[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scan = async () => {
    setLoading(true)
    setError(null)
    try {
      const results = await findProfitChains(defaultProfitMoveFilters, 12)
      setChains(results)
      if (results.length === 0) setError('No multi-step chains found with current filters.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chain scan failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel nested-panel">
      <div className="panel-header-inline">
        <h3>Profit chains</h3>
        <button type="button" className="secondary" disabled={loading} onClick={() => void scan()}>
          {loading ? 'Scanning…' : 'Find chains'}
        </button>
      </div>
      <p className="hint">Buy inputs → combine → list output. Multi-ingredient profitable pipelines.</p>
      {error ? <p className="error">{error}</p> : null}

      {chains.length > 0 ? (
        <ul className="chain-list">
          {chains.map((chain) => (
            <li key={`${chain.outputItemId}-${chain.listProfit}`}>
              <button
                type="button"
                className="row-link"
                onClick={() =>
                  openItem({ id: chain.outputItemId, name: chain.outputName, icon: chain.outputIcon })
                }
              >
                {chain.outputIcon ? <img src={chain.outputIcon} alt="" width={24} height={24} /> : null}
                <strong>{chain.outputName}</strong>
              </button>
              <ol>
                {chain.steps.map((step) => (
                  <li key={step.label}>{step.label}</li>
                ))}
              </ol>
              <p>
                Profit / craft: <strong className="profit">{formatCoins(chain.listProfit)}</strong> ({chain.listingRoi.toFixed(1)}% ROI)
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

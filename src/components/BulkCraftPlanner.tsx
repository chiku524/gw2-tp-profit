import { useState } from 'react'
import { useApiKey } from '../context/ApiKeyProvider'
import { formatCoins } from '../lib/coins'
import { planBulkCraftWithBank } from '../lib/bulkCraftPlanner'
import type { BulkCraftPlan, ProfitMove } from '../types'

type Props = {
  move: ProfitMove | null
  onClose: () => void
}

export function BulkCraftPlanner({ move, onClose }: Props) {
  const { apiKey, canUse } = useApiKey()
  const [runs, setRuns] = useState(25)
  const [plan, setPlan] = useState<BulkCraftPlan | null>(null)
  const [loading, setLoading] = useState(false)

  const calculate = async () => {
    if (!move) return
    setLoading(true)
    try {
      const result = await planBulkCraftWithBank(move, runs, apiKey || null, canUse('craftingBank'))
      setPlan(result)
    } finally {
      setLoading(false)
    }
  }

  if (!move) return null

  return (
    <section className="panel nested-panel bulk-planner">
      <div className="panel-header-inline">
        <h3>Bulk craft planner</h3>
        <button type="button" className="icon-btn" onClick={onClose}>
          ✕
        </button>
      </div>
      <p className="hint">
        Plan {move.outputItemName} crafts — bank materials subtracted when Inventories permission is set.
      </p>
      <div className="filters">
        <div className="field">
          <label htmlFor="bulk-runs">Crafts to run</label>
          <input
            id="bulk-runs"
            type="number"
            min={1}
            max={1000}
            value={runs}
            onChange={(event) => setRuns(Number(event.target.value))}
          />
        </div>
        <button type="button" className="primary" disabled={loading} onClick={() => void calculate()}>
          {loading ? 'Planning…' : 'Calculate'}
        </button>
      </div>

      {plan ? (
        <>
          <div className="stat-grid">
            <div>
              <span>TP buy cost</span>
              <strong>{formatCoins(plan.shoppingList.reduce((sum, row) => {
                const unit = move.inputs.find((input) => input.itemId === row.itemId)?.unitCost ?? 0
                return sum + row.buy * unit
              }, 0))}</strong>
            </div>
            <div>
              <span>Listing revenue</span>
              <strong>{formatCoins(plan.totalOutputValue)}</strong>
            </div>
            <div>
              <span>Est. profit</span>
              <strong className="profit">{formatCoins(plan.totalProfit)}</strong>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Need</th>
                  <th>In bank</th>
                  <th>Buy</th>
                </tr>
              </thead>
              <tbody>
                {plan.shoppingList.map((row) => (
                  <tr key={row.itemId}>
                    <td>{row.name}</td>
                    <td>{row.needed}</td>
                    <td>{row.have}</td>
                    <td>{row.buy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  )
}

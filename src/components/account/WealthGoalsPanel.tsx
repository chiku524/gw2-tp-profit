import { useState } from 'react'
import { formatCoins, parseCoinsInput } from '../../lib/coins'
import type { WealthGoal } from '../../types'
import {
  addWealthGoal,
  goalProgress,
  loadWealthGoals,
  removeWealthGoal,
} from '../../lib/wealthGoals'
import type { CapitalSnapshot } from '../../lib/accountSnapshot'

type Props = {
  capital: CapitalSnapshot | null
  gw2eTotal?: number | null
}

export function WealthGoalsPanel({ capital, gw2eTotal = null }: Props) {
  const [goals, setGoals] = useState<WealthGoal[]>(() => loadWealthGoals())
  const [label, setLabel] = useState('')
  const [target, setTarget] = useState('100 gold')
  const [metric, setMetric] = useState<WealthGoal['metric']>('liquid')

  const addGoal = () => {
    const targetCopper = parseCoinsInput(target) ?? 0
    if (!label.trim() || targetCopper <= 0) return
    setGoals(addWealthGoal({ label: label.trim(), targetCopper, metric }))
    setLabel('')
    setTarget('100 gold')
  }

  const removeGoal = (id: string) => {
    setGoals(removeWealthGoal(id))
  }

  return (
    <section className="panel nested-panel wealth-goals">
      <h3>Wealth goals</h3>
      <p className="hint">Track progress toward savings targets using your liquid or total account value.</p>

      <div className="filters goal-form">
        <div className="field">
          <label htmlFor="goal-label">Goal</label>
          <input id="goal-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Legendary weapon" />
        </div>
        <div className="field">
          <label htmlFor="goal-target">Target</label>
          <input id="goal-target" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="100 gold" />
        </div>
        <div className="field">
          <label htmlFor="goal-metric">Measure</label>
          <select id="goal-metric" value={metric} onChange={(event) => setMetric(event.target.value as WealthGoal['metric'])}>
            <option value="liquid">Liquid TP total</option>
            <option value="wallet">Wallet gold</option>
            <option value="total">gw2efficiency total</option>
          </select>
        </div>
        <button type="button" className="secondary" onClick={addGoal}>
          Add goal
        </button>
      </div>

      {goals.length === 0 ? (
        <p className="empty-state">No goals yet — add one to stay focused while you build wealth.</p>
      ) : (
        <ul className="goal-list">
          {goals.map((goal) => {
            const progress = capital
              ? goalProgress(goal, capital.totalLiquid, gw2eTotal, capital.walletGold)
              : { current: 0, percent: 0 }
            return (
              <li key={goal.id}>
                <div className="goal-header">
                  <strong>{goal.label}</strong>
                  <button type="button" className="icon-btn" onClick={() => removeGoal(goal.id)} title="Remove">
                    ✕
                  </button>
                </div>
                <div className="goal-progress-bar">
                  <div className="goal-progress-fill" style={{ width: `${progress.percent}%` }} />
                </div>
                <p className="hint">
                  {formatCoins(progress.current)} / {formatCoins(goal.targetCopper)} ({progress.percent.toFixed(1)}%)
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

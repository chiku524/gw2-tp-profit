import { scanProfitMoves } from './profitMoves'
import type { ProfitChain, ProfitMoveFilters } from '../types'

export async function findProfitChains(
  filters: ProfitMoveFilters,
  maxChains = 15,
): Promise<ProfitChain[]> {
  const moves = await scanProfitMoves({ ...filters, maxResults: 40 })
  const chains: ProfitChain[] = []

  for (const move of moves) {
    if (move.inputs.length < 2) continue

    const steps = [
      ...move.inputs.map((input) => ({
        label: `Buy ${input.count}× ${input.name}`,
        cost: input.unitCost * input.count,
      })),
      {
        label: `Combine → ${move.outputCount > 1 ? `${move.outputCount}× ` : ''}${move.outputItemName}`,
        cost: 0,
      },
      {
        label: `List on TP`,
        cost: -move.outputListPrice,
      },
    ]

    chains.push({
      outputItemId: move.outputItemId,
      outputName: move.outputItemName,
      outputIcon: move.outputIcon,
      steps,
      totalCost: move.inputCost,
      listProfit: move.listingProfit,
      listingRoi: move.listingRoi,
      kind: move.kind,
    })
  }

  return chains.sort((a, b) => b.listProfit - a.listProfit).slice(0, maxChains)
}

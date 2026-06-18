import { fetchBankItemCounts } from './gw2Api'
import { listingFlipProfit } from './profit'
import type { BulkCraftPlan, ProfitMove } from '../types'

export function planBulkCraft(
  move: ProfitMove,
  runs: number,
  bankCounts: Record<number, number>,
): BulkCraftPlan {
  const safeRuns = Math.max(1, Math.min(10_000, Math.floor(runs)))

  const shoppingList = move.inputs.map((input) => {
    const needed = input.count * safeRuns
    const have = bankCounts[input.itemId] ?? 0
    const buy = Math.max(0, needed - have)
    return {
      itemId: input.itemId,
      name: input.name,
      needed,
      have: Math.min(have, needed),
      buy,
    }
  })

  const buyCost = shoppingList.reduce((sum, row) => {
    const input = move.inputs.find((entry) => entry.itemId === row.itemId)
    return sum + row.buy * (input?.unitCost ?? 0)
  }, 0)

  const totalInputCost = move.inputCost * safeRuns
  const totalOutputValue = move.outputListPrice * safeRuns
  const totalProfit = listingFlipProfit(buyCost, totalOutputValue)

  return {
    move,
    runs: safeRuns,
    totalInputCost,
    totalOutputValue,
    totalProfit,
    shoppingList,
  }
}

export async function planBulkCraftWithBank(
  move: ProfitMove,
  runs: number,
  accessToken: string | null,
  useBank: boolean,
): Promise<BulkCraftPlan> {
  let bankCounts: Record<number, number> = {}
  if (useBank && accessToken) {
    try {
      bankCounts = await fetchBankItemCounts(accessToken)
    } catch {
      bankCounts = {}
    }
  }
  return planBulkCraft(move, runs, bankCounts)
}

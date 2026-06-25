import {
  fetchCommercePrices,
  fetchRecipeIds,
  fetchRecipesBatched,
} from './gw2Api'
import { fetchItemsBatched } from './itemNames'
import { matchesRecipeDisciplines } from './disciplines'
import { suggestUndercutSell } from './marketMath'
import { listingFlipProfit, roi } from './profit'
import { isRecipeCraftable, type CraftingContext } from './recipeAccess'
import type {
  CommercePrice,
  Gw2Item,
  Gw2Recipe,
  ProfitMove,
  ProfitMoveFilters,
  ProfitMoveKind,
} from '../types'

const COMBINE_RECIPE_TYPES = new Set(['Refinement', 'Component'])

const KIND_BY_TYPE: Record<string, ProfitMoveKind> = {
  Refinement: 'refinement',
  Component: 'craft',
}

export const defaultProfitMoveFilters: ProfitMoveFilters = {
  minProfit: 10,
  minRoi: 2,
  kinds: ['refinement', 'craft'],
  maxResults: 80,
  onlyCraftable: false,
  disciplines: [],
}

function profitMoveFromRecipe(
  recipe: Gw2Recipe,
  priceMap: Map<number, CommercePrice>,
  itemMap: Map<number, Gw2Item>,
): ProfitMove | null {
  const kind = KIND_BY_TYPE[recipe.type]
  if (!kind) return null

  const inputs: ProfitMove['inputs'] = []
  let inputCost = 0

  for (const ingredient of recipe.ingredients) {
    const price = priceMap.get(ingredient.item_id)
    const unitCost = price?.sells.unit_price ?? 0
    if (unitCost <= 0) return null

    inputCost += unitCost * ingredient.count
    inputs.push({
      itemId: ingredient.item_id,
      name: itemMap.get(ingredient.item_id)?.name ?? `Item ${ingredient.item_id}`,
      count: ingredient.count,
      unitCost,
    })
  }

  const outputPrice = priceMap.get(recipe.output_item_id)
  const lowestSell = outputPrice?.sells.unit_price ?? 0
  if (lowestSell <= 0 || inputCost <= 0) return null

  const outputCount = recipe.output_item_count
  const listTotal = suggestUndercutSell(lowestSell) * outputCount
  const listingProfit = listingFlipProfit(inputCost, listTotal)
  const instantProfit = (outputPrice?.buys.unit_price ?? 0) * outputCount - inputCost
  const outputItem = itemMap.get(recipe.output_item_id)

  return {
    recipeId: recipe.id,
    kind,
    outputItemId: recipe.output_item_id,
    outputItemName: outputItem?.name ?? `Item ${recipe.output_item_id}`,
    outputIcon: outputItem?.icon,
    outputCount,
    inputs,
    inputCost,
    outputListPrice: listTotal,
    listingProfit,
    listingRoi: roi(listingProfit, inputCost),
    instantProfit,
    disciplines: recipe.disciplines ?? [],
  }
}

export async function scanProfitMoves(
  filters: ProfitMoveFilters,
  onProgress?: (message: string, loaded: number, total: number) => void,
  signal?: { aborted: boolean },
  craftingContext?: CraftingContext | null,
): Promise<ProfitMove[]> {
  onProgress?.('Loading recipe list…', 0, 1)
  const recipeIds = await fetchRecipeIds()
  if (signal?.aborted) return []

  const recipes: Gw2Recipe[] = []
  for (let index = 0; index < recipeIds.length; index += 200) {
    if (signal?.aborted) return []
    const batch = recipeIds.slice(index, index + 200)
    const fetched = await fetchRecipesBatched(batch)
    for (const recipe of fetched) {
      if (COMBINE_RECIPE_TYPES.has(recipe.type)) recipes.push(recipe)
    }
    onProgress?.(
      'Loading combine recipes…',
      Math.min(index + batch.length, recipeIds.length),
      recipeIds.length,
    )
  }

  const itemIds = new Set<number>()
  for (const recipe of recipes) {
    itemIds.add(recipe.output_item_id)
    for (const ingredient of recipe.ingredients) itemIds.add(ingredient.item_id)
  }

  const priceMap = new Map<number, CommercePrice>()
  const ids = [...itemIds]
  for (let index = 0; index < ids.length; index += 200) {
    if (signal?.aborted) return []
    const batch = ids.slice(index, index + 200)
    const prices = await fetchCommercePrices(batch)
    for (const price of prices) priceMap.set(price.id, price)
    onProgress?.('Pricing ingredients & outputs…', Math.min(index + batch.length, ids.length), ids.length)
  }

  const items = await fetchItemsBatched(ids)
  const itemMap = new Map(items.map((item) => [item.id, item]))

  const moves: ProfitMove[] = []
  for (const recipe of recipes) {
    if (filters.onlyCraftable && craftingContext) {
      if (
        !isRecipeCraftable(recipe, craftingContext, {
          requireUnlock: true,
          requireLevel: true,
        })
      ) {
        continue
      }
    }

    const move = profitMoveFromRecipe(recipe, priceMap, itemMap)
    if (!move) continue
    if (!filters.kinds.includes(move.kind)) continue
    if (!matchesRecipeDisciplines(recipe.disciplines, filters.disciplines)) continue
    if (move.listingProfit < filters.minProfit) continue
    if (move.listingRoi < filters.minRoi) continue
    moves.push(move)
  }

  moves.sort((a, b) => b.listingProfit - a.listingProfit)
  return moves.slice(0, filters.maxResults)
}

export function formatProfitMoveInputs(move: ProfitMove): string {
  return move.inputs.map((row) => `${row.count}× ${row.name}`).join(' + ')
}

export function kindLabel(kind: ProfitMoveKind): string {
  return kind === 'refinement' ? 'Refinement' : 'Craft'
}

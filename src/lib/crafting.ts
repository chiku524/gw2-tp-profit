import { nestRecipes } from '@gw2efficiency/recipe-nesting'
import { cheapestTree, useVendorPrices } from '@gw2efficiency/recipe-calculation'
import {
  fetchBankItemCounts,
  fetchCommercePrice,
  fetchRecipes,
  searchRecipesByOutput,
} from './gw2Api'
import { listingFlipProfit, instantFlipProfit } from './profit'
import type { CraftingResult, Gw2Recipe } from '../types'

type RecipeTreeNode = {
  id: number
  quantity: number
  output: number
  components?: RecipeTreeNode[]
  craftPrice?: number
}

async function collectRecipesForItem(
  outputItemId: number,
  visited = new Set<number>(),
  depth = 0,
): Promise<Gw2Recipe[]> {
  if (depth > 4 || visited.has(outputItemId)) return []
  visited.add(outputItemId)

  const recipeIds = await searchRecipesByOutput(outputItemId)
  if (recipeIds.length === 0) return []

  const recipes = await fetchRecipes(recipeIds.slice(0, 8))
  const collected = [...recipes]

  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const nested = await collectRecipesForItem(ingredient.item_id, visited, depth + 1)
      collected.push(...nested)
    }
  }

  const unique = new Map<number, Gw2Recipe>()
  for (const recipe of collected) {
    unique.set(recipe.id, recipe)
  }
  return [...unique.values()]
}

function treeCraftCost(tree: RecipeTreeNode): number {
  return tree.craftPrice ?? 0
}

export async function calculateCraftingProfits(
  outputItemId: number,
  outputItemName: string,
  icon: string | undefined,
  accessToken: string | null,
  useBank: boolean,
): Promise<CraftingResult[]> {
  const recipes = await collectRecipesForItem(outputItemId)
  if (recipes.length === 0) return []

  const nested = nestRecipes(recipes as Parameters<typeof nestRecipes>[0])
  const treesForItem = nested.filter((tree) => tree.id === outputItemId)
  if (treesForItem.length === 0) return []

  const itemIds = new Set<number>([outputItemId])
  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      itemIds.add(ingredient.item_id)
    }
  }

  const prices = await Promise.all([...itemIds].map((id) => fetchCommercePrice(id).catch(() => null)))
  const buyPrices: Record<number, number> = {}
  const sellPrices: Record<number, number> = {}

  for (const price of prices) {
    if (!price) continue
    if (price.sells.unit_price > 0) buyPrices[price.id] = price.sells.unit_price
    if (price.buys.unit_price > 0) sellPrices[price.id] = price.buys.unit_price
  }

  const itemPrices = useVendorPrices(buyPrices)
  let availableItems: Record<number, number> = {}
  if (useBank && accessToken) {
    try {
      availableItems = await fetchBankItemCounts(accessToken)
    } catch {
      availableItems = {}
    }
  }

  const outputSell = sellPrices[outputItemId] ?? 0
  const results: CraftingResult[] = []

  for (const tree of treesForItem) {
    const recipe = recipes.find((entry) => entry.output_item_id === outputItemId)
    if (!recipe) continue

    const calculated = cheapestTree(1, tree, itemPrices, availableItems) as RecipeTreeNode
    const craftCost = treeCraftCost(calculated)
    const instantProfit = instantFlipProfit(craftCost, outputSell)
    const listingProfit = craftCost > 0 && outputSell > 0 ? listingFlipProfit(craftCost, outputSell) : 0

    results.push({
      outputItemId,
      outputItemName,
      icon,
      recipeId: recipe.id,
      craftCost,
      sellRevenue: outputSell,
      listingRevenue: outputSell > 0 ? Math.round(outputSell * 0.85) : 0,
      instantProfit,
      listingProfit,
      disciplines: recipe.disciplines ?? [],
    })
  }

  return results.sort((a, b) => b.listingProfit - a.listingProfit)
}

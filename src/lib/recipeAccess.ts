import { fetchAccountRecipes, fetchAllAccountCharacters } from './gw2Api'
import type { Gw2Character, Gw2Recipe } from '../types'

export type CraftingContext = {
  unlockedRecipeIds: Set<number>
  maxRatingByDiscipline: Map<string, number>
  characterCount: number
}

export function isAutoLearnedRecipe(recipe: Gw2Recipe): boolean {
  if (recipe.flags?.includes('AutoLearned')) return true
  if (recipe.type === 'Refinement') return true
  return false
}

export function meetsCraftingLevel(
  recipe: Gw2Recipe,
  maxRatingByDiscipline: Map<string, number>,
): boolean {
  const required = recipe.min_rating ?? 0
  if (required <= 0) return true

  const disciplines = recipe.disciplines ?? []
  if (disciplines.length === 0) return true

  return disciplines.some((discipline) => (maxRatingByDiscipline.get(discipline) ?? 0) >= required)
}

export function isRecipeCraftable(
  recipe: Gw2Recipe,
  context: CraftingContext | null,
  options: { requireUnlock?: boolean; requireLevel?: boolean } = {},
): boolean {
  const { requireUnlock = false, requireLevel = false } = options
  if (!context) return true

  if (requireLevel && !meetsCraftingLevel(recipe, context.maxRatingByDiscipline)) return false

  if (!requireUnlock) return true
  if (isAutoLearnedRecipe(recipe)) return true
  return context.unlockedRecipeIds.has(recipe.id)
}

function maxRatingsFromCharacters(characters: Gw2Character[]): Map<string, number> {
  const ratings = new Map<string, number>()
  for (const character of characters) {
    for (const craft of character.crafting ?? []) {
      const current = ratings.get(craft.discipline) ?? 0
      if (craft.rating > current) ratings.set(craft.discipline, craft.rating)
    }
  }
  return ratings
}

export async function loadCraftingContext(accessToken: string): Promise<CraftingContext> {
  const [unlockedRecipeIds, characters] = await Promise.all([
    fetchAccountRecipes(accessToken).catch(() => [] as number[]),
    fetchAllAccountCharacters(accessToken).catch(() => [] as Gw2Character[]),
  ])

  return {
    unlockedRecipeIds: new Set(unlockedRecipeIds),
    maxRatingByDiscipline: maxRatingsFromCharacters(characters),
    characterCount: characters.length,
  }
}

export function craftingLevelSummary(context: CraftingContext | null): string {
  if (!context || context.maxRatingByDiscipline.size === 0) return ''
  const top = [...context.maxRatingByDiscipline.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, rating]) => `${name} ${rating}`)
  return top.join(' · ')
}

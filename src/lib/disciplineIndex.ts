import { fetchRecipeIds, fetchRecipesBatched } from './gw2Api'
import type { Gw2Recipe } from '../types'

const CACHE_KEY = 'gw2-tp-profit.discipline-index-v1'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

let memoryIndex: Map<number, string[]> | null = null
let buildPromise: Promise<Map<number, string[]>> | null = null

function addRecipeToIndex(index: Map<number, Set<string>>, recipe: Gw2Recipe): void {
  const disciplines = recipe.disciplines ?? []
  if (disciplines.length === 0) return

  const existing = index.get(recipe.output_item_id) ?? new Set<string>()
  for (const discipline of disciplines) existing.add(discipline)
  index.set(recipe.output_item_id, existing)
}

function finalizeIndex(index: Map<number, Set<string>>): Map<number, string[]> {
  const result = new Map<number, string[]>()
  for (const [itemId, disciplines] of index) {
    result.set(itemId, [...disciplines].sort())
  }
  return result
}

function loadCachedIndex(): Map<number, string[]> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { savedAt: number; entries: [number, string[]][] }
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null
    return new Map(parsed.entries)
  } catch {
    return null
  }
}

function saveCachedIndex(index: Map<number, string[]>): void {
  try {
    const payload = {
      savedAt: Date.now(),
      entries: [...index.entries()],
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota errors */
  }
}

async function buildDisciplineIndex(
  onProgress?: (message: string, loaded: number, total: number) => void,
  signal?: { aborted?: boolean },
): Promise<Map<number, string[]>> {
  onProgress?.('Loading recipe list for discipline index…', 0, 1)
  const recipeIds = await fetchRecipeIds()
  if (signal?.aborted) return new Map()

  const index = new Map<number, Set<string>>()
  for (let offset = 0; offset < recipeIds.length; offset += 200) {
    if (signal?.aborted) return finalizeIndex(index)
    const batch = recipeIds.slice(offset, offset + 200)
    const recipes = await fetchRecipesBatched(batch)
    for (const recipe of recipes) addRecipeToIndex(index, recipe)
    onProgress?.(
      'Building discipline index…',
      Math.min(offset + batch.length, recipeIds.length),
      recipeIds.length,
    )
  }

  return finalizeIndex(index)
}

export async function getDisciplineIndex(options?: {
  onProgress?: (message: string, loaded: number, total: number) => void
  signal?: { aborted?: boolean }
}): Promise<Map<number, string[]>> {
  if (memoryIndex) return memoryIndex

  const cached = loadCachedIndex()
  if (cached) {
    memoryIndex = cached
    return cached
  }

  if (!buildPromise) {
    buildPromise = buildDisciplineIndex(options?.onProgress, options?.signal).then((index) => {
      memoryIndex = index
      saveCachedIndex(index)
      buildPromise = null
      return index
    })
  }

  return buildPromise
}

export function disciplinesForItem(
  itemId: number,
  index: Map<number, string[]> | null | undefined,
): string[] {
  return index?.get(itemId) ?? []
}

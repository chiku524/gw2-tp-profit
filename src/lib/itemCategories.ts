import type { ItemCategoryFilter } from '../types'

/** GW2 API `type` values grouped for trading-post browsing. */
export const ITEM_CATEGORY_OPTIONS: {
  id: ItemCategoryFilter
  label: string
  description: string
  types: readonly string[]
}[] = [
  {
    id: 'materials',
    label: 'Resources & materials',
    description: 'Crafting mats, trophies, gathering tools',
    types: ['CraftingMaterial', 'Trophy', 'Gathering'],
  },
  {
    id: 'consumables',
    label: 'Consumables',
    description: 'Food, potions, utilities, dyes',
    types: ['Consumable'],
  },
  {
    id: 'gear',
    label: 'Gear & equipment',
    description: 'Weapons, armor, trinkets, backs',
    types: ['Weapon', 'Armor', 'Trinket', 'Back'],
  },
  {
    id: 'upgrades',
    label: 'Upgrades',
    description: 'Sigils, runes, infusions',
    types: ['UpgradeComponent'],
  },
  {
    id: 'containers',
    label: 'Containers',
    description: 'Chests, bags, loot boxes',
    types: ['Container', 'Bag'],
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Minis, toys, keys, misc.',
    types: ['MiniPet', 'Tool', 'Gizmo', 'Collectible', 'Key', 'Bundle', 'Toy', 'Transformation'],
  },
]

const TYPE_TO_CATEGORY = new Map<string, ItemCategoryFilter>()

for (const option of ITEM_CATEGORY_OPTIONS) {
  for (const type of option.types) {
    TYPE_TO_CATEGORY.set(type, option.id)
  }
}

export function categoryForItemType(itemType?: string): ItemCategoryFilter {
  if (!itemType) return 'other'
  return TYPE_TO_CATEGORY.get(itemType) ?? 'other'
}

export function categoryLabel(category: ItemCategoryFilter): string {
  return ITEM_CATEGORY_OPTIONS.find((option) => option.id === category)?.label ?? category
}

export function matchesItemCategories(
  itemType: string | undefined,
  selected: ItemCategoryFilter[],
): boolean {
  if (selected.length === 0) return true
  const category = categoryForItemType(itemType)
  return selected.includes(category)
}

export function toggleCategory(
  selected: ItemCategoryFilter[],
  category: ItemCategoryFilter,
): ItemCategoryFilter[] {
  if (selected.includes(category)) {
    return selected.filter((entry) => entry !== category)
  }
  return [...selected, category]
}

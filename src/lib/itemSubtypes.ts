import type { Gw2Item } from '../types'

export type SubtypeFilterGroup = {
  label: string
  options: { id: string; label: string }[]
}

/** Curated GW2 item detail tags for trading-post browsing. */
export const SUBTYPE_FILTER_GROUPS: SubtypeFilterGroup[] = [
  {
    label: 'Consumables',
    options: [
      { id: 'Food', label: 'Food' },
      { id: 'Utility', label: 'Utilities' },
      { id: 'Potion', label: 'Potions' },
      { id: 'Booze', label: 'Booze' },
      { id: 'Mystery', label: 'Mystery consumables' },
    ],
  },
  {
    label: 'Armor weight',
    options: [
      { id: 'Heavy', label: 'Heavy' },
      { id: 'Medium', label: 'Medium' },
      { id: 'Light', label: 'Light' },
    ],
  },
  {
    label: 'Crafting materials',
    options: [
      { id: 'Metal', label: 'Metal' },
      { id: 'Wood', label: 'Wood' },
      { id: 'Leather', label: 'Leather' },
      { id: 'Cloth', label: 'Cloth' },
      { id: 'Gemstone', label: 'Gemstone' },
      { id: 'Bone', label: 'Bone' },
      { id: 'Claw', label: 'Claw' },
      { id: 'Fang', label: 'Fang' },
      { id: 'Trophy', label: 'Trophies' },
      { id: 'Part', label: 'Parts' },
    ],
  },
  {
    label: 'Weapons',
    options: [
      { id: 'Sword', label: 'Swords' },
      { id: 'Axe', label: 'Axes' },
      { id: 'Mace', label: 'Maces' },
      { id: 'Hammer', label: 'Hammers' },
      { id: 'Greatsword', label: 'Greatswords' },
      { id: 'Dagger', label: 'Daggers' },
      { id: 'Pistol', label: 'Pistols' },
      { id: 'Rifle', label: 'Rifles' },
      { id: 'Staff', label: 'Staves' },
      { id: 'Focus', label: 'Focus' },
      { id: 'Shield', label: 'Shields' },
      { id: 'Torch', label: 'Torches' },
      { id: 'Warhorn', label: 'Warhorns' },
      { id: 'LongBow', label: 'Longbows' },
      { id: 'ShortBow', label: 'Shortbows' },
      { id: 'Spear', label: 'Spears' },
      { id: 'Trident', label: 'Tridents' },
      { id: 'Scepter', label: 'Scepters' },
    ],
  },
  {
    label: 'Upgrades',
    options: [
      { id: 'Sigil', label: 'Sigils' },
      { id: 'Rune', label: 'Runes' },
      { id: 'Infusion', label: 'Infusions' },
    ],
  },
  {
    label: 'Trinkets',
    options: [
      { id: 'Accessory', label: 'Accessories' },
      { id: 'Amulet', label: 'Amulets' },
      { id: 'Ring', label: 'Rings' },
      { id: 'Earring', label: 'Earrings' },
    ],
  },
]

export const ALL_SUBTYPE_FILTER_IDS = SUBTYPE_FILTER_GROUPS.flatMap((group) =>
  group.options.map((option) => option.id),
)

export function itemFilterTags(item: Gw2Item, disciplines: string[] = []): string[] {
  const tags = new Set<string>()
  if (item.type) tags.add(item.type)
  if (item.details?.type) tags.add(item.details.type)
  if (item.details?.weight_class) tags.add(item.details.weight_class)
  if (item.details?.material_type) tags.add(item.details.material_type)
  if (item.details?.infusion_type) tags.add('Infusion')
  for (const discipline of disciplines) tags.add(discipline)
  return [...tags]
}

export function toggleSubtype(selected: string[], subtype: string): string[] {
  if (selected.includes(subtype)) {
    return selected.filter((entry) => entry !== subtype)
  }
  return [...selected, subtype]
}

export function matchesSubtypes(itemTags: string[] | undefined, selected: string[]): boolean {
  if (selected.length === 0) return true
  if (!itemTags?.length) return false
  return itemTags.some((tag) => selected.includes(tag))
}

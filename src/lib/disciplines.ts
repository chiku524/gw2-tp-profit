/** GW2 crafting discipline ids from the API. */
export const DISCIPLINE_IDS = [
  'Armorsmith',
  'Artificer',
  'Chef',
  'Huntsman',
  'Jeweler',
  'Leatherworker',
  'Tailor',
  'Weaponsmith',
  'Scribe',
] as const

export type DisciplineId = (typeof DISCIPLINE_IDS)[number]

export const DISCIPLINE_LABELS: Record<DisciplineId, string> = {
  Armorsmith: 'Armorsmithing',
  Artificer: 'Artificering',
  Chef: 'Cooking',
  Huntsman: 'Huntsman',
  Jeweler: 'Jeweling',
  Leatherworker: 'Leatherworking',
  Tailor: 'Tailoring',
  Weaponsmith: 'Weaponsmithing',
  Scribe: 'Scribing',
}

export const DISCIPLINE_OPTIONS = DISCIPLINE_IDS.map((id) => ({
  id,
  label: DISCIPLINE_LABELS[id],
}))

export function disciplineLabel(discipline: string): string {
  return DISCIPLINE_LABELS[discipline as DisciplineId] ?? discipline
}

export function toggleDiscipline(selected: string[], discipline: string): string[] {
  if (selected.includes(discipline)) {
    return selected.filter((entry) => entry !== discipline)
  }
  return [...selected, discipline]
}

export function matchesDisciplines(
  itemDisciplines: string[] | undefined,
  selected: string[],
): boolean {
  if (selected.length === 0) return true
  if (!itemDisciplines?.length) return false
  return itemDisciplines.some((discipline) => selected.includes(discipline))
}

export function matchesRecipeDisciplines(
  recipeDisciplines: string[] | undefined,
  selected: string[],
): boolean {
  if (selected.length === 0) return true
  const disciplines = recipeDisciplines ?? []
  if (disciplines.length === 0) return false
  return disciplines.some((discipline) => selected.includes(discipline))
}

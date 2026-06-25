import { matchesDisciplines } from './disciplines'
import { matchesItemCategories } from './itemCategories'
import { matchesSubtypes } from './itemSubtypes'
import type { FlipOpportunity, ScanFilters } from '../types'

export function scanFiltersNeedItemMetadata(filters: ScanFilters): boolean {
  return (
    filters.categories.length > 0 ||
    filters.disciplines.length > 0 ||
    filters.subtypes.length > 0
  )
}

export function matchesScanFilters(row: FlipOpportunity, filters: ScanFilters): boolean {
  if (!matchesItemCategories(row.itemType, filters.categories)) return false
  if (!matchesDisciplines(row.itemDisciplines, filters.disciplines)) return false
  if (!matchesSubtypes(row.itemTags, filters.subtypes)) return false
  return true
}

export function filterRowsByScanFilters(rows: FlipOpportunity[], filters: ScanFilters): FlipOpportunity[] {
  if (
    filters.categories.length === 0 &&
    filters.disciplines.length === 0 &&
    filters.subtypes.length === 0
  ) {
    return rows
  }
  return rows.filter((row) => matchesScanFilters(row, filters))
}

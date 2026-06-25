import type { ReactNode } from 'react'
import { ITEM_CATEGORY_OPTIONS, toggleCategory } from '../lib/itemCategories'
import { DISCIPLINE_OPTIONS, toggleDiscipline } from '../lib/disciplines'
import { SUBTYPE_FILTER_GROUPS, toggleSubtype } from '../lib/itemSubtypes'
import type { ScanFilters } from '../types'

type Props = {
  filters: ScanFilters
  onChange: (filters: ScanFilters) => void
}

function FilterSection({
  title,
  hint,
  selectedCount,
  onClear,
  children,
}: {
  title: string
  hint: string
  selectedCount: number
  onClear?: () => void
  children: ReactNode
}): ReactNode {
  return (
    <details className="filter-section" open={selectedCount > 0}>
      <summary className="filter-section-summary">
        <span className="field-label">{title}</span>
        <span className="hint">{selectedCount === 0 ? hint : `${selectedCount} selected`}</span>
        {selectedCount > 0 && onClear ? (
          <button
            type="button"
            className="filter-section-clear"
            onClick={(event) => {
              event.preventDefault()
              onClear()
            }}
          >
            Clear
          </button>
        ) : null}
      </summary>
      <div className="category-chips">{children}</div>
    </details>
  )
}

export function ScanFilterPanel({ filters, onChange }: Props) {
  const categoryCount = filters.categories.length
  const disciplineCount = filters.disciplines.length
  const subtypeCount = filters.subtypes.length
  const totalSelected = categoryCount + disciplineCount + subtypeCount

  return (
    <div className="scan-filter-panel">
      <div className="filter-panel-header">
        <span className="field-label">Browse filters</span>
        <span className="hint">
          {totalSelected === 0 ? 'All items' : `${totalSelected} filter${totalSelected === 1 ? '' : 's'} active`}
        </span>
        {totalSelected > 0 ? (
          <button
            type="button"
            className="category-chip clear"
            onClick={() =>
              onChange({
                ...filters,
                categories: [],
                disciplines: [],
                subtypes: [],
              })
            }
          >
            Clear all
          </button>
        ) : null}
      </div>

      <FilterSection
        title="Item categories"
        hint="All categories"
        selectedCount={categoryCount}
        onClear={() => onChange({ ...filters, categories: [] })}
      >
        {ITEM_CATEGORY_OPTIONS.map((option) => {
          const active = filters.categories.includes(option.id)
          return (
            <button
              key={option.id}
              type="button"
              className={active ? 'category-chip active' : 'category-chip'}
              title={option.description}
              onClick={() =>
                onChange({
                  ...filters,
                  categories: toggleCategory(filters.categories, option.id),
                })
              }
            >
              {option.label}
            </button>
          )
        })}
      </FilterSection>

      <FilterSection
        title="Crafting disciplines"
        hint="Any discipline"
        selectedCount={disciplineCount}
        onClear={() => onChange({ ...filters, disciplines: [] })}
      >
        {DISCIPLINE_OPTIONS.map((option) => {
          const active = filters.disciplines.includes(option.id)
          return (
            <button
              key={option.id}
              type="button"
              className={active ? 'category-chip active' : 'category-chip'}
              onClick={() =>
                onChange({
                  ...filters,
                  disciplines: toggleDiscipline(filters.disciplines, option.id),
                })
              }
            >
              {option.label}
            </button>
          )
        })}
      </FilterSection>

      {SUBTYPE_FILTER_GROUPS.map((group) => (
        <FilterSection
          key={group.label}
          title={group.label}
          hint="Any"
          selectedCount={group.options.filter((option) => filters.subtypes.includes(option.id)).length}
          onClear={() =>
            onChange({
              ...filters,
              subtypes: filters.subtypes.filter(
                (subtype) => !group.options.some((option) => option.id === subtype),
              ),
            })
          }
        >
          {group.options.map((option) => {
            const active = filters.subtypes.includes(option.id)
            return (
              <button
                key={option.id}
                type="button"
                className={active ? 'category-chip active' : 'category-chip'}
                onClick={() =>
                  onChange({
                    ...filters,
                    subtypes: toggleSubtype(filters.subtypes, option.id),
                  })
                }
              >
                {option.label}
              </button>
            )
          })}
        </FilterSection>
      ))}
    </div>
  )
}

// Backward-compatible export for any legacy imports.
export { filterRowsByScanFilters as filterRowsByCategory } from '../lib/scanFilters'
export { ITEM_CATEGORY_OPTIONS, toggleCategory } from '../lib/itemCategories'

import { ITEM_CATEGORY_OPTIONS, toggleCategory } from '../lib/itemCategories'
import type { ItemCategoryFilter, ScanFilters } from '../types'

type Props = {
  filters: ScanFilters
  onChange: (filters: ScanFilters) => void
}

export function CategoryFilters({ filters, onChange }: Props) {
  const selected = filters.categories

  return (
    <div className="category-filters">
      <div className="category-header">
        <span className="field-label">Item categories</span>
        <span className="hint">
          {selected.length === 0 ? 'All categories' : `${selected.length} selected`}
        </span>
      </div>
      <div className="category-chips">
        {ITEM_CATEGORY_OPTIONS.map((option) => {
          const active = selected.includes(option.id)
          return (
            <button
              key={option.id}
              type="button"
              className={active ? 'category-chip active' : 'category-chip'}
              title={option.description}
              onClick={() =>
                onChange({
                  ...filters,
                  categories: toggleCategory(selected, option.id),
                })
              }
            >
              {option.label}
            </button>
          )
        })}
        {selected.length > 0 ? (
          <button
            type="button"
            className="category-chip clear"
            onClick={() => onChange({ ...filters, categories: [] })}
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function filterRowsByCategory<T extends { itemCategory?: ItemCategoryFilter }>(
  rows: T[],
  categories: ItemCategoryFilter[],
): T[] {
  if (categories.length === 0) return rows
  return rows.filter((row) => row.itemCategory && categories.includes(row.itemCategory))
}

import { SCAN_PRESETS } from '../lib/scanPresets'
import type { ScanFilters } from '../types'

type Props = {
  filters: ScanFilters
  onApply: (filters: ScanFilters) => void
}

export function ScanPresets({ filters, onApply }: Props) {
  return (
    <div className="preset-row">
      {SCAN_PRESETS.map((preset) => {
        const active =
          filters.minProfit === preset.minProfit &&
          filters.minRoi === preset.minRoi &&
          filters.minVolume === preset.minVolume &&
          Boolean(filters.f2pOnly) === Boolean(preset.f2pOnly)

        return (
          <button
            key={preset.id}
            type="button"
            className={active ? 'preset-btn active' : 'preset-btn'}
            title={preset.description}
            onClick={() =>
              onApply({
                ...filters,
                minProfit: preset.minProfit,
                minRoi: preset.minRoi,
                minVolume: preset.minVolume,
                f2pOnly: preset.f2pOnly ?? false,
              })
            }
          >
            <strong>{preset.label}</strong>
            <span>{preset.description}</span>
          </button>
        )
      })}
    </div>
  )
}

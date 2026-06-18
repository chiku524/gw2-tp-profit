import type { RiskFlag } from '../types'

export function RiskFlagBadges({ flags = [] }: { flags?: RiskFlag[] }) {
  if (flags.length === 0) return null

  return (
    <span className="risk-flags">
      {flags.map((flag) => (
        <span key={`${flag.kind}-${flag.label}`} className={`badge risk-${flag.severity}`} title={flag.label}>
          {flag.label}
        </span>
      ))}
    </span>
  )
}

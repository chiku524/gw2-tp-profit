import type { ReactNode } from 'react'
import { useApiKey } from '../context/ApiKeyProvider'
import { FEATURE_LABELS, FEATURE_REQUIREMENTS, PERMISSION_LABELS } from '../lib/permissions'

type Feature = keyof typeof FEATURE_REQUIREMENTS

type GateProps = {
  feature: Feature
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGate({ feature, children, fallback }: GateProps) {
  const { canUse } = useApiKey()
  if (canUse(feature)) return <>{children}</>
  if (fallback) return <>{fallback}</>
  return <PermissionHint feature={feature} />
}

type HintProps = {
  feature: Feature
  compact?: boolean
}

export function PermissionHint({ feature, compact = false }: HintProps) {
  const { missingFor } = useApiKey()
  const missing = missingFor(feature)
  const labels = missing.map((permission) => PERMISSION_LABELS[permission as keyof typeof PERMISSION_LABELS] ?? permission)

  if (compact) {
    return (
      <p className="hint permission-hint">
        Needs {labels.join(', ')} permission{labels.length === 1 ? '' : 's'} on your API key.
      </p>
    )
  }

  return (
    <div className="permission-hint-panel">
      <p>
        <strong>{FEATURE_LABELS[feature]}</strong> needs these API key permissions:{' '}
        {labels.join(', ')}.
      </p>
      <p className="hint">
        Create or update your key at{' '}
        <a href="https://account.arena.net/applications" target="_blank" rel="noreferrer">
          account.arena.net/applications
        </a>
        , then refresh in Settings.
      </p>
    </div>
  )
}

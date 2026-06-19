import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { clearApiKey, isUsingEnvApiKey, loadApiKey, saveApiKey } from '../lib/apiKeyStorage'
import { fetchAccount, fetchTokenInfo } from '../lib/gw2Api'
import { FEATURE_REQUIREMENTS, missingPermissions } from '../lib/permissions'
import type { Gw2Account, TokenInfo } from '../types'

type ApiKeyContextValue = {
  apiKey: string
  tokenInfo: TokenInfo | null
  account: Gw2Account | null
  loading: boolean
  error: string | null
  setApiKey: (key: string) => Promise<void>
  clearKey: () => void
  refresh: () => Promise<void>
  canUse: (feature: keyof typeof FEATURE_REQUIREMENTS) => boolean
  missingFor: (feature: keyof typeof FEATURE_REQUIREMENTS) => string[]
  isConnected: boolean
  keySource: 'stored' | 'env' | 'none'
}

const ApiKeyContext = createContext<ApiKeyContextValue | null>(null)

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState(loadApiKey)
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [account, setAccount] = useState<Gw2Account | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateKey = useCallback(async (key: string) => {
    if (!key.trim()) {
      setTokenInfo(null)
      setAccount(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [info, profile] = await Promise.all([
        fetchTokenInfo(key),
        fetchAccount(key),
      ])
      setTokenInfo(info)
      setAccount(profile)
    } catch (err) {
      setTokenInfo(null)
      setAccount(null)
      setError(err instanceof Error ? err.message : 'Failed to validate API key')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void validateKey(apiKey)
  }, [apiKey, validateKey])

  const setApiKey = useCallback(
    async (key: string) => {
      const trimmed = key.trim()
      saveApiKey(trimmed)
      setApiKeyState(trimmed)
      await validateKey(trimmed)
    },
    [validateKey],
  )

  const clearKey = useCallback(() => {
    clearApiKey()
    setApiKeyState('')
    setTokenInfo(null)
    setAccount(null)
    setError(null)
  }, [])

  const refresh = useCallback(async () => {
    await validateKey(apiKey)
  }, [apiKey, validateKey])

  const value = useMemo<ApiKeyContextValue>(() => {
    const permissions = tokenInfo?.permissions ?? []
    return {
      apiKey,
      tokenInfo,
      account,
      loading,
      error,
      setApiKey,
      clearKey,
      refresh,
      canUse: (feature) => missingPermissions(permissions, FEATURE_REQUIREMENTS[feature]).length === 0,
      missingFor: (feature) => missingPermissions(permissions, FEATURE_REQUIREMENTS[feature]),
      isConnected: Boolean(tokenInfo && !error),
      keySource: apiKey
        ? isUsingEnvApiKey()
          ? 'env'
          : 'stored'
        : 'none',
    }
  }, [apiKey, tokenInfo, account, loading, error, setApiKey, clearKey, refresh])

  return <ApiKeyContext.Provider value={value}>{children}</ApiKeyContext.Provider>
}

export function useApiKey() {
  const context = useContext(ApiKeyContext)
  if (!context) {
    throw new Error('useApiKey must be used within ApiKeyProvider')
  }
  return context
}

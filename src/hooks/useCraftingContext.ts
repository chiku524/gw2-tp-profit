import { useCallback, useEffect, useState } from 'react'
import { useApiKey } from '../context/ApiKeyProvider'
import { loadCraftingContext, type CraftingContext } from '../lib/recipeAccess'

export function useCraftingContext() {
  const { apiKey, isConnected } = useApiKey()
  const [context, setContext] = useState<CraftingContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!apiKey || !isConnected) {
      setContext(null)
      return null
    }

    setLoading(true)
    setError(null)
    try {
      const loaded = await loadCraftingContext(apiKey)
      setContext(loaded)
      return loaded
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load crafting profile')
      setContext(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [apiKey, isConnected])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { context, loading, error, refresh }
}

const STORAGE_KEY = 'gw2-tp-profit.api-key'

/** Optional default key from Vite env (`.env.local` or Vercel env vars). */
export function getEnvApiKey(): string {
  const value = import.meta.env.VITE_GW2_API_KEY
  return typeof value === 'string' ? value.trim() : ''
}

export function loadApiKey(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)?.trim()
    if (stored) return stored
  } catch {
    // ignore
  }
  return getEnvApiKey()
}

export function isUsingEnvApiKey(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)?.trim()
    return !stored && Boolean(getEnvApiKey())
  } catch {
    return Boolean(getEnvApiKey())
  }
}

export function saveApiKey(key: string): void {
  const trimmed = key.trim()
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY, trimmed)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEY)
}

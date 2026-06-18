const STORAGE_KEY = 'gw2-tp-profit.api-key'

export function loadApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() ?? ''
  } catch {
    return ''
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

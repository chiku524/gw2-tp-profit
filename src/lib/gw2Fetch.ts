const API_BASE = 'https://api.guildwars2.com/v2'

export type Gw2FetchOptions = {
  accessToken?: string
  signal?: AbortSignal
}

export async function gw2Fetch<T>(
  path: string,
  { accessToken, signal }: Gw2FetchOptions = {},
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`)
  if (accessToken) {
    url.searchParams.set('access_token', accessToken)
  }

  const response = await fetch(url, { signal })
  if (!response.ok) {
    const detail = response.status === 401 ? 'Invalid or expired API key' : `HTTP ${response.status}`
    throw new Error(`GW2 API ${detail}`)
  }
  return response.json() as Promise<T>
}

export async function gw2FetchAllPages<T>(
  path: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<T[]> {
  const results: T[] = []
  let page = 0
  let pageSize = 200

  while (true) {
    const separator = path.includes('?') ? '&' : '?'
    const pagePath = `${path}${separator}page=${page}&page_size=${pageSize}`
    const url = new URL(`${API_BASE}${pagePath}`)
    url.searchParams.set('access_token', accessToken)

    const response = await fetch(url, { signal })
    if (!response.ok) {
      throw new Error(`GW2 API HTTP ${response.status}`)
    }

    const batch = (await response.json()) as T[]
    if (!Array.isArray(batch) || batch.length === 0) break
    results.push(...batch)

    const resultTotal = Number(response.headers.get('X-Result-Total') ?? batch.length)
    const resultCount = Number(response.headers.get('X-Result-Count') ?? batch.length)
    if (results.length >= resultTotal || resultCount < pageSize) break
    page += 1
  }

  return results
}

export { API_BASE }

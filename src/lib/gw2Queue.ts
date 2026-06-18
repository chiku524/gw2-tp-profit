const MIN_GAP_MS = 80
const MAX_RETRIES = 4

let lastRequestAt = 0
let chain: Promise<unknown> = Promise.resolve()

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function isRateLimitedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return error.message.includes('429') || error.message.toLowerCase().includes('rate')
}

export function queueGw2Request<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
  const run = async (): Promise<T> => {
    const now = Date.now()
    const wait = Math.max(0, MIN_GAP_MS - (now - lastRequestAt))
    if (wait > 0) await sleep(wait)
    lastRequestAt = Date.now()

    try {
      return await fn()
    } catch (error) {
      if (isRateLimitedError(error) && attempt < MAX_RETRIES) {
        const backoff = 400 * 2 ** attempt
        await sleep(backoff)
        return queueGw2Request(fn, attempt + 1)
      }
      throw error
    }
  }

  const next = chain.then(run, run)
  chain = next.catch(() => undefined)
  return next
}

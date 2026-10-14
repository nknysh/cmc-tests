import type { RateLimiter } from '../RateLimiter'
import type { CmcApiStatus } from '../types'

const API_KEY_HEADER = 'X-CMC_PRO_API_KEY'
const HTTP_TOO_MANY_REQUESTS = 429

/** Formats CMC's `status.error_code`/`error_message` for an error body, or '' if the body isn't a CMC status. */
function describeApiError(responseText: string): string {
  try {
    const { status } = JSON.parse(responseText) as { status?: CmcApiStatus }
    return status?.error_code ? ` (error_code ${status.error_code}: ${status.error_message})` : ''
  } catch {
    return ''
  }
}

export interface EndpointOptions {
  apiKey: string
  baseUrl: string
  rateLimiter?: RateLimiter
}

/**
 * Shared request plumbing for a single CoinMarketCap endpoint: builds the
 * URL, logs the request/response (redacting the API key), and throws on a
 * non-OK response. Each subclass owns exactly one endpoint's params and
 * response parsing.
 */
export abstract class BaseEndpoint {
  private readonly apiKey: string
  protected readonly baseUrl: string
  private readonly rateLimiter?: RateLimiter

  constructor({ apiKey, baseUrl, rateLimiter }: EndpointOptions) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
    this.rateLimiter = rateLimiter
  }

  protected async request(path: string, params: Record<string, string | undefined>): Promise<string> {
    const url = new URL(path, this.baseUrl)
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, value)
    }

    const headers = {
      [API_KEY_HEADER]: this.apiKey,
      Accept: 'application/json',
    }

    console.log(`[${this.constructor.name}] request`, {
      method: 'GET',
      url: url.toString(),
      headers: { ...headers, [API_KEY_HEADER]: '[redacted]' },
    })

    const send = () => fetch(url, { headers })
    const response = this.rateLimiter
      ? await this.rateLimiter.run(send, (res) => res.status === HTTP_TOO_MANY_REQUESTS)
      : await send()
    const responseText = await response.text()

    console.log(`[${this.constructor.name}] response`, {
      url: url.toString(),
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText,
    })

    if (!response.ok) {
      throw new Error(
        `CoinMarketCap API request failed: ${response.status} ${response.statusText}${describeApiError(responseText)}`,
      )
    }

    return responseText
  }
}

const API_KEY_HEADER = 'X-CMC_PRO_API_KEY'

export interface EndpointOptions {
  apiKey: string
  baseUrl: string
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

  constructor({ apiKey, baseUrl }: EndpointOptions) {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
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

    const response = await fetch(url, { headers })
    const responseText = await response.text()

    console.log(`[${this.constructor.name}] response`, {
      url: url.toString(),
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText,
    })

    if (!response.ok) {
      throw new Error(`CoinMarketCap API request failed: ${response.status} ${response.statusText}`)
    }

    return responseText
  }
}

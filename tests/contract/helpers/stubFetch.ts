export interface FetchStub {
  /** Every request the code under test sent while the stub was installed. */
  readonly requests: Request[]
  restore(): void
}

/**
 * Replaces `globalThis.fetch` with one that records each request and answers
 * every call with `body` as JSON at `status`, so consumer contract tests run
 * the real client offline against a recorded fixture. Call `restore()` after
 * each test. Safe under `fullyParallel`: each worker is its own process.
 */
export function stubFetch(status: number, body: unknown): FetchStub {
  const originalFetch = globalThis.fetch
  const requests: Request[] = []

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(new Request(input, init))
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  return {
    requests,
    restore: () => {
      globalThis.fetch = originalFetch
    },
  }
}

import path from 'node:path'
import type { Page, Request, Route } from '@playwright/test'

/** The data files the app fetches, by name without `.json`. */
export type DataFile = 'latest' | 'history' | 'previous' | 'previous-history'

/** The committed price history fixture, served for history.json or previous-history.json. */
export const HISTORY_FIXTURE_PATH = path.join(__dirname, '../../../app/public/data/history.json')

const dataFileUrl = (file: DataFile) => `**/data/${file}.json`

/**
 * Answers one data file with `handler` from now on, replacing any route set for it before,
 * such as the fixture's default latest.json. A handler that never calls `route.fulfill`,
 * `abort` or `continue` leaves the request unanswered.
 */
export async function routeDataFile(page: Page, file: DataFile, handler: (route: Route) => Promise<void> | void) {
  await page.unroute(dataFileUrl(file))
  await page.route(dataFileUrl(file), handler)
}

/**
 * Counts the page's requests to one data file from now on. With `completedOnly`, requests
 * the page cancelled don't count.
 */
export function countRequests(page: Page, file: DataFile, { completedOnly = false } = {}): () => number {
  let count = 0
  const onRequest = (request: Request) => {
    if (new URL(request.url()).pathname.endsWith(`/data/${file}.json`)) count += 1
  }
  if (completedOnly) page.on('requestfinished', onRequest)
  else page.on('request', onRequest)
  return () => count
}

/** Holds route handlers until the test releases them, so a file stays loading as long as needed. */
export class Gate {
  private open: () => void = () => undefined
  /** Resolves once the gate is released. */
  readonly released = new Promise<void>((resolve) => {
    this.open = resolve
  })

  release() {
    this.open()
  }
}

import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CoinMarketCapClient, RateLimiter, type ListingEntry } from '../src/clients/coinmarketcap'
import type { Coin, MarketSnapshot, PriceHistory } from '../app/src/data/types'
import { findInvalidPrices } from '../app/src/data/validate'

/**
 * Writes the CoinBoard app's data files from one listings/latest call (1
 * credit for 100 coins), but only when every coin's price is above 0 (APP-06):
 * - `latest.json`: the current top coins as a MarketSnapshot.
 * - `history.json`: the previous history plus this snapshot's prices, trimmed
 *   to a rolling HISTORY_WINDOW_MS, for the coin page's price chart.
 * - `previous.json` / `previous-history.json`: copies of the two above. They're
 *   the last snapshot this script confirmed, which the app falls back to if the
 *   published latest.json has an invalid price anyway (e.g. a manual edit).
 *   Only this script writes them, so an unconfirmed file never becomes one.
 *
 * A snapshot with any price of 0 or below is rejected whole: nothing is
 * written, the rejection is logged, and the run still succeeds, so the last
 * accepted snapshot stays published and no other alert is raised. On GitHub
 * Actions, the step output `accepted` is `true` or `false`.
 *
 * Usage: tsx scripts/snapshot-listings.ts [outDir] [previousHistoryPath]
 * The previous history is read from a separate path so a run never appends
 * live prices to the synthetic fixture history committed in app/public/data.
 * Pass the deployed previous-history.json: it holds confirmed prices only.
 * Without one (the first deploy), history starts from this snapshot alone.
 */

const LISTING_LIMIT = 100
const CONVERT = 'USD'
const HISTORY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
/** Enough for any chart, and keeps history.json small. */
const PRICE_SIGNIFICANT_DIGITS = 6
const DEFAULT_OUT_DIR = 'app/public/data'
/** One call per run, so the limiter only matters for its retry after a 429. */
const REQUESTS_PER_MINUTE = 25

function toCoin(entry: ListingEntry): Coin {
  const quote = entry.quotes.find((q) => q.currency === CONVERT)
  if (!quote) throw new Error(`${entry.symbol} has no ${CONVERT} quote`)
  return {
    id: entry.id,
    name: entry.name,
    symbol: entry.symbol,
    slug: entry.slug,
    rank: entry.rank,
    tags: entry.tags,
    dateAdded: entry.dateAdded,
    circulatingSupply: entry.circulatingSupply,
    totalSupply: entry.totalSupply,
    maxSupply: entry.maxSupply,
    price: quote.price,
    marketCap: quote.marketCap,
    volume24h: quote.volume24h,
    marketCapDominance: quote.marketCapDominance,
    percentChange1h: quote.percentChange1h,
    percentChange24h: quote.percentChange24h,
    percentChange7d: quote.percentChange7d,
    percentChange30d: quote.percentChange30d,
  }
}

async function readHistory(historyPath: string | undefined): Promise<PriceHistory> {
  if (!historyPath) return { points: [] }
  try {
    return JSON.parse(await readFile(historyPath, 'utf8')) as PriceHistory
  } catch (error) {
    console.warn(`[snapshot-listings] no previous history at ${historyPath}, starting fresh:`, error)
    return { points: [] }
  }
}

function appendToHistory(history: PriceHistory, snapshot: MarketSnapshot): PriceHistory {
  const cutoff = Date.parse(snapshot.updatedAt) - HISTORY_WINDOW_MS
  const prices = Object.fromEntries(
    snapshot.coins.map((coin) => [String(coin.id), Number(coin.price.toPrecision(PRICE_SIGNIFICANT_DIGITS))]),
  )
  const kept = history.points.filter((point) => Date.parse(point.t) >= cutoff && point.t !== snapshot.updatedAt)
  return { points: [...kept, { t: snapshot.updatedAt, prices }] }
}

/** Tells a GitHub Actions workflow whether the snapshot was accepted. A no-op elsewhere. */
async function setAcceptedOutput(accepted: boolean): Promise<void> {
  const outputFile = process.env.GITHUB_OUTPUT
  if (outputFile) await appendFile(outputFile, `accepted=${accepted}\n`)
}

async function main(): Promise<void> {
  const [outDir = DEFAULT_OUT_DIR, previousHistoryPath] = process.argv.slice(2)
  const apiKey = process.env.CMC_API_KEY
  if (!apiKey) throw new Error('CMC_API_KEY must be set')

  const client = new CoinMarketCapClient({
    apiKey,
    rateLimiter: new RateLimiter({ requestsPerMinute: REQUESTS_PER_MINUTE }),
  })
  const { entries, timestamp, creditCount } = await client.fetchListingsLatest({
    limit: LISTING_LIMIT,
    convert: CONVERT,
  })

  const snapshot: MarketSnapshot = { updatedAt: timestamp, coins: entries.map(toCoin) }

  const invalid = findInvalidPrices(snapshot)
  if (invalid.length > 0) {
    const prices = invalid.map((coin) => `${coin.symbol} (${coin.price})`).join(', ')
    console.log(
      `[snapshot-listings] rejected the snapshot taken at ${snapshot.updatedAt}: ${invalid.length} coin(s) priced at 0 or below: ${prices}. Nothing was written; the last accepted snapshot stays published.`,
    )
    await setAcceptedOutput(false)
    return
  }

  const history = appendToHistory(await readHistory(previousHistoryPath), snapshot)
  const snapshotJson = `${JSON.stringify(snapshot)}\n`
  const historyJson = `${JSON.stringify(history)}\n`

  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, 'latest.json'), snapshotJson)
  await writeFile(path.join(outDir, 'history.json'), historyJson)
  await writeFile(path.join(outDir, 'previous.json'), snapshotJson)
  await writeFile(path.join(outDir, 'previous-history.json'), historyJson)
  await setAcceptedOutput(true)
  console.log(
    `[snapshot-listings] accepted ${snapshot.coins.length} coins and wrote them with ${history.points.length} history points to ${outDir} (${creditCount} credit)`,
  )
}

main().catch((error: unknown) => {
  console.error('[snapshot-listings] failed:', error)
  process.exitCode = 1
})

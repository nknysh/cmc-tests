import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { MarketSnapshot } from '../../../app/src/data/types'
import { findInvalidPrices } from '../../../app/src/data/validate'

const FIXTURE_PATH = path.join(__dirname, '../../../app/public/data/latest.json')

/** Parses the fixture, failing at load with a clear message if it isn't a usable snapshot. */
function loadFixture(): MarketSnapshot {
  const snapshot: MarketSnapshot = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'))
  if (!Array.isArray(snapshot.coins) || snapshot.coins.length < 2) {
    throw new Error(`${FIXTURE_PATH} needs a coins array with at least two coins`)
  }
  const invalid = findInvalidPrices(snapshot)
  if (invalid.length > 0) {
    throw new Error(`${FIXTURE_PATH} has prices of 0 or below, which APP-06 rejects: ${invalid.map((coin) => coin.symbol).join(', ')}`)
  }
  return snapshot
}

/**
 * The committed fixture snapshot (taken 2026-10-15T15:12 UTC, 100 coins). Tests
 * serve it in place of the app's `latest.json`, so expected values don't depend
 * on the snapshot the app happens to be deployed with.
 */
export const fixtureSnapshot: MarketSnapshot = loadFixture()

// Stub builders. The app lists coins in `coins` array order, not by `rank`, so a
// stub that changes the ranking changes both. None of them touch prices, so every
// price stays above 0 and APP-06 doesn't reject the stub.

/** The snapshot without one coin. Other entries, ranks included, are unchanged. */
export function withoutCoin(snapshot: MarketSnapshot, slug: string): MarketSnapshot {
  return { ...snapshot, coins: snapshot.coins.filter((coin) => coin.slug !== slug) }
}

/** The snapshot without one coin, with the remaining coins renumbered from rank 1. */
export function withoutCoinReranked(snapshot: MarketSnapshot, slug: string): MarketSnapshot {
  const coins = withoutCoin(snapshot, slug).coins.map((coin, index) => ({ ...coin, rank: index + 1 }))
  return { ...snapshot, coins }
}

/** The snapshot with its top two coins swapped, in both order and rank. */
export function withTopTwoSwapped(snapshot: MarketSnapshot): MarketSnapshot {
  const [first, second, ...rest] = snapshot.coins
  if (!first || !second) throw new Error('withTopTwoSwapped needs a snapshot with at least two coins')
  return { ...snapshot, coins: [{ ...second, rank: 1 }, { ...first, rank: 2 }, ...rest] }
}

/** A coin's label in the app's coin selects, e.g. "Bitcoin (BTC)". */
export const coinLabel = ({ name, symbol }: { name: string; symbol: string }): string => `${name} (${symbol})`

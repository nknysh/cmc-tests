import { test, expect } from '@tests/coinboard/fixtures'
import { coinLabel, fixtureSnapshot, withoutCoin, withoutCoinReranked, withTopTwoSwapped } from '@tests/coinboard/data/snapshot'
import { BITCOIN, BNB, ETHEREUM, SAME_COIN_MESSAGE, TETHER, US_DOLLAR } from '@tests/coinboard/types'
import { Severity, severity } from '@tests/helpers/severity'

// Automates app/user-stories/compare/CMP-01-two-coins-can-be-compared.test.md: one
// test per test case, with the same title and severity.

const TOP_FOUR = [BITCOIN, ETHEREUM, TETHER, BNB]
const LAST_COIN = 'Bitcoin SV (BSV)'
const FIXTURE_LABELS = fixtureSnapshot.coins.map(coinLabel)

// Stubbed snapshots, served by the tests that need them.
const ETHEREUM_RANKED_FIRST = withTopTwoSwapped(fixtureSnapshot)
const WITHOUT_BITCOIN = withoutCoinReranked(fixtureSnapshot, 'bitcoin')
const WITHOUT_BNB = withoutCoin(fixtureSnapshot, 'bnb')

test.describe('CMP-01: Two coins can be compared', { tag: ['@compare', '@CMP-01'] }, () => {
  test('User sees the Compare coins page with First coin and Second coin choices', severity(Severity.BLOCKER), async ({ comparePage }) => {
    await comparePage.goto()

    await expect(comparePage.heading).toBeVisible()
    await expect(comparePage.firstCoin).toBeVisible()
    await expect(comparePage.secondCoin).toBeVisible()
    await expect(comparePage.table).toBeVisible()
  })

  test('Coin choices offer every snapshot coin as name and symbol without US Dollar', severity(Severity.NORMAL), async ({ comparePage }) => {
    await comparePage.goto()
    await expect(comparePage.table).toBeVisible()

    await test.step('First coin offers every snapshot coin', async () => {
      await expect(comparePage.options('first')).toHaveText(FIXTURE_LABELS)
      await expect(comparePage.options('first').filter({ hasText: US_DOLLAR })).toHaveCount(0)
    })

    await test.step('Second coin offers the same coins in the same order', async () => {
      await expect(comparePage.options('second')).toHaveText(FIXTURE_LABELS)
    })
  })

  test('Coin choices list coins in rank order', severity(Severity.NORMAL), async ({ comparePage }) => {
    await comparePage.goto()
    await expect(comparePage.table).toBeVisible()

    const firstOptions = comparePage.options('first')
    for (const [index, label] of TOP_FOUR.entries()) {
      await expect(firstOptions.nth(index)).toHaveText(label)
    }
    await expect(firstOptions.last()).toHaveText(LAST_COIN)
    await expect(comparePage.options('second')).toHaveText(await firstOptions.allTextContents())
  })

  test('User sees the top two ranked coins compared by default', severity(Severity.CRITICAL), async ({ comparePage }) => {
    await comparePage.goto()

    await expect(comparePage.selectedOption('first')).toHaveText(BITCOIN)
    await expect(comparePage.selectedOption('second')).toHaveText(ETHEREUM)
    await expect(comparePage.coinHeader('first')).toHaveText('Bitcoin')
    await expect(comparePage.coinHeader('second')).toHaveText('Ethereum')
  })

  test('Default pair follows the ranking when Ethereum is ranked above Bitcoin', severity(Severity.NORMAL), async ({ comparePage, serveSnapshot }) => {
    await serveSnapshot(ETHEREUM_RANKED_FIRST)
    await comparePage.goto()

    await expect(comparePage.selectedOption('first')).toHaveText(ETHEREUM)
    await expect(comparePage.selectedOption('second')).toHaveText(BITCOIN)
    await expect(comparePage.coinHeader('first')).toHaveText('Ethereum')
  })

  test('Default pair follows the ranking when Bitcoin is not in the snapshot', severity(Severity.NORMAL), async ({ comparePage, serveSnapshot }) => {
    await serveSnapshot(WITHOUT_BITCOIN)
    await comparePage.goto()

    await expect(comparePage.selectedOption('first')).toHaveText(ETHEREUM)
    await expect(comparePage.selectedOption('second')).toHaveText(TETHER)
    await expect(comparePage.coinHeader('first')).toHaveText('Ethereum')
    await expect(comparePage.coinHeader('second')).toHaveText('Tether USDt')
    await expect(comparePage.alert).toHaveCount(0)
  })

  test('User can change the First coin and see the comparison update at once', severity(Severity.CRITICAL), async ({ comparePage, page }) => {
    await test.step('open the default pair', async () => {
      await comparePage.goto()
      await expect(comparePage.coinHeader('first')).toHaveText('Bitcoin')
      await expect(comparePage.coinHeader('second')).toHaveText('Ethereum')
    })

    await test.step('choose BNB as First coin', async () => {
      await comparePage.choose('first', BNB)
      await expect(comparePage.coinHeader('first')).toHaveText('BNB')
      await expect(comparePage.coinHeader('second')).toHaveText('Ethereum')
      await expect(comparePage.cell('Rank', 'first')).toHaveText('#4')
      await expect(page.getByRole('button', { name: /^(submit|apply|compare)$/i })).toHaveCount(0)
    })
  })

  test('User can change the Second coin and see the comparison update at once', severity(Severity.CRITICAL), async ({ comparePage }) => {
    await test.step('open the default pair', async () => {
      await comparePage.goto()
      await expect(comparePage.coinHeader('first')).toHaveText('Bitcoin')
      await expect(comparePage.coinHeader('second')).toHaveText('Ethereum')
    })

    await test.step('choose Tether USDt as Second coin', async () => {
      await comparePage.choose('second', TETHER)
      await expect(comparePage.coinHeader('second')).toHaveText('Tether USDt')
      await expect(comparePage.coinHeader('first')).toHaveText('Bitcoin')
      await expect(comparePage.cell('Price', 'second')).toHaveText('$0.999')
    })
  })

  test('Comparison shows one column per coin with the First coin on the left', severity(Severity.CRITICAL), async ({ comparePage }) => {
    await comparePage.goto()
    await expect(comparePage.table).toBeVisible()

    await test.step('choose BNB as First coin', async () => {
      await comparePage.choose('first', BNB)
      await expect(comparePage.coinHeader('first')).toHaveText('BNB')
    })

    await test.step('choose Bitcoin as Second coin', async () => {
      await comparePage.choose('second', BITCOIN)
      await expect(comparePage.columnHeaders).toHaveText(['Metric', 'BNB', 'Bitcoin'])
      await expect(comparePage.cell('Rank', 'first')).toHaveText('#4')
      await expect(comparePage.cell('Rank', 'second')).toHaveText('#1')
    })
  })

  test('User sees a pick-two-different-coins message when the same coin is chosen for both', severity(Severity.NORMAL), async ({ comparePage }) => {
    await comparePage.goto()
    await expect(comparePage.table).toBeVisible()

    await comparePage.choose('second', BITCOIN)

    await expect(comparePage.alert).toHaveText(SAME_COIN_MESSAGE)
    await expect(comparePage.table).toHaveCount(0)
    await expect(comparePage.selectedOption('first')).toHaveText(BITCOIN)
    await expect(comparePage.selectedOption('second')).toHaveText(BITCOIN)
  })

  test('User can get the comparison back after choosing the same coin twice', severity(Severity.NORMAL), async ({ comparePage }) => {
    await comparePage.goto()
    await expect(comparePage.table).toBeVisible()

    await test.step('choose Ethereum as First coin too', async () => {
      await comparePage.choose('first', ETHEREUM)
      await expect(comparePage.alert).toHaveText(SAME_COIN_MESSAGE)
    })

    await test.step('choose BNB as Second coin', async () => {
      await comparePage.choose('second', BNB)
      await expect(comparePage.alert).toHaveCount(0)
      await expect(comparePage.coinHeader('first')).toHaveText('Ethereum')
      await expect(comparePage.coinHeader('second')).toHaveText('BNB')
    })
  })

  test('Missing First coin falls back to the top-ranked coin', severity(Severity.CRITICAL), async ({ comparePage, serveSnapshot }) => {
    await serveSnapshot(WITHOUT_BNB)
    await comparePage.goto('?a=bnb&b=tether')

    await expect(comparePage.selectedOption('first')).toHaveText(BITCOIN)
    await expect(comparePage.selectedOption('second')).toHaveText(TETHER)
    await expect(comparePage.coinHeader('first')).toHaveText('Bitcoin')
    await expect(comparePage.coinHeader('second')).toHaveText('Tether USDt')
    await expect(comparePage.alert).toHaveCount(0)
  })

  test('Missing Second coin falls back to the second-ranked coin', severity(Severity.CRITICAL), async ({ comparePage, serveSnapshot }) => {
    await serveSnapshot(WITHOUT_BNB)
    await comparePage.goto('?a=tether&b=bnb')

    await expect(comparePage.selectedOption('first')).toHaveText(TETHER)
    await expect(comparePage.selectedOption('second')).toHaveText(ETHEREUM)
    await expect(comparePage.coinHeader('first')).toHaveText('Tether USDt')
    await expect(comparePage.coinHeader('second')).toHaveText('Ethereum')
    await expect(comparePage.alert).toHaveCount(0)
  })

  test('Same missing coin chosen twice falls back to the default pair', severity(Severity.NORMAL), async ({ comparePage, serveSnapshot }) => {
    await serveSnapshot(WITHOUT_BNB)
    await comparePage.goto('?a=bnb&b=bnb')

    await expect(comparePage.selectedOption('first')).toHaveText(BITCOIN)
    await expect(comparePage.selectedOption('second')).toHaveText(ETHEREUM)
    await expect(comparePage.coinHeader('first')).toHaveText('Bitcoin')
    await expect(comparePage.coinHeader('second')).toHaveText('Ethereum')
    await expect(comparePage.alert).toHaveCount(0)
  })

  test("Fallback to the other choice's coin shows the pick-two-different-coins message", severity(Severity.MINOR), async ({ comparePage, serveSnapshot }) => {
    await serveSnapshot(WITHOUT_BNB)
    await comparePage.goto('?a=bnb&b=bitcoin')

    await expect(comparePage.alert).toHaveText(SAME_COIN_MESSAGE)
    await expect(comparePage.table).toHaveCount(0)
    await expect(comparePage.selectedOption('first')).toHaveText(BITCOIN)
    await expect(comparePage.selectedOption('second')).toHaveText(BITCOIN)
  })
})

import { test, expect } from '@tests/coinboard/fixtures'
import { fixtureSnapshot, withTopTwoSwapped } from '@tests/coinboard/data/snapshot'
import type { ComparePage } from '@tests/coinboard/pages/ComparePage'
import { BITCOIN, BNB, ETHEREUM, SAME_COIN_MESSAGE, TETHER } from '@tests/coinboard/types'
import { Severity, severity } from '@tests/helpers/severity'

// Automates app/user-stories/compare/CMP-03-comparison-can-be-shared-as-a-link.test.md: one
// test per test case, with the same title and severity. The table-driven fallback case runs
// as one test per row, its title suffixed with the row's address.

// Stubbed snapshot, served by the tests that need it.
const ETHEREUM_RANKED_FIRST = withTopTwoSwapped(fixtureSnapshot)

/** Rows of the unknown-slug fallback case: the address, then the coins each select shows. */
const FALLBACK_ROWS = [
  { query: '?a=not-a-coin&b=tether', first: BITCOIN, second: TETHER },
  { query: '?a=tether&b=not-a-coin', first: TETHER, second: ETHEREUM },
  { query: '?a=&b=bnb', first: BITCOIN, second: BNB },
  { query: '?a=BNB&b=tether', first: BITCOIN, second: TETHER },
]

/** A select label without its symbol, as the comparison's column header shows it: "BNB (BNB)" → "BNB". */
const coinName = (label: string) => label.replace(/ \([^)]+\)$/, '')

/** Waits until the address is `#/compare` with exactly one `a` and one `b`, in either order. */
async function expectPairInAddress(comparePage: ComparePage, a: string, b: string) {
  await expect.poll(() => comparePage.address()).toEqual({ route: '/compare', query: [['a', a], ['b', b]] })
}

/** Checks both selects and both comparison columns show the pair, `first` on the left. */
async function expectPairShown(comparePage: ComparePage, first: string, second: string) {
  await expect(comparePage.selectedOption('first')).toHaveText(first)
  await expect(comparePage.selectedOption('second')).toHaveText(second)
  await expect(comparePage.coinHeader('first')).toHaveText(coinName(first))
  await expect(comparePage.coinHeader('second')).toHaveText(coinName(second))
}

test.describe('CMP-03: Comparison can be shared as a link', { tag: ['@compare', '@CMP-03'] }, () => {
  test('Choosing a First coin puts both coins\' slugs in the address', { annotation: severity(Severity.CRITICAL) }, async ({ comparePage, page }) => {
    await comparePage.goto()
    await expect(page).toHaveURL(/#\/compare$/)

    await comparePage.choose('first', BNB)
    await expectPairInAddress(comparePage, 'bnb', 'ethereum')
  })

  test('Choosing only a Second coin keeps the default First coin\'s slug in the address', { annotation: severity(Severity.NORMAL) }, async ({ comparePage }) => {
    await comparePage.goto()
    await expect(comparePage.coinHeader('first')).toHaveText('Bitcoin')
    await expect(comparePage.coinHeader('second')).toHaveText('Ethereum')

    await comparePage.choose('second', TETHER)
    await expectPairInAddress(comparePage, 'bitcoin', 'tether')
  })

  test('User opening a shared address sees that pair with a as First coin', { annotation: severity(Severity.CRITICAL) }, async ({ comparePage }) => {
    await comparePage.goto('?a=bnb&b=tether')

    await expectPairShown(comparePage, BNB, TETHER)
  })

  test('Reloading the page keeps the chosen pair', { annotation: severity(Severity.NORMAL) }, async ({ comparePage, page }) => {
    await test.step('choose BNB as First coin', async () => {
      await comparePage.goto()
      await expect(comparePage.table).toBeVisible()
      await comparePage.choose('first', BNB)
      await expectPairInAddress(comparePage, 'bnb', 'ethereum')
    })

    await test.step('reload the page', async () => {
      await page.reload()
      await expectPairShown(comparePage, BNB, ETHEREUM)
    })
  })

  test('Address without a uses the top-ranked coin as First coin', { annotation: severity(Severity.NORMAL) }, async ({ comparePage }) => {
    await comparePage.goto('?b=bnb')

    await expectPairShown(comparePage, BITCOIN, BNB)
  })

  test('Address without b uses the second-ranked coin as Second coin', { annotation: severity(Severity.NORMAL) }, async ({ comparePage }) => {
    await comparePage.goto('?a=tether')

    await expectPairShown(comparePage, TETHER, ETHEREUM)
  })

  test('Address without a uses the top-ranked coin when Ethereum is ranked above Bitcoin', { annotation: severity(Severity.NORMAL) }, async ({ comparePage, serveSnapshot }) => {
    await serveSnapshot(ETHEREUM_RANKED_FIRST)
    await comparePage.goto('?b=bnb')

    await expectPairShown(comparePage, ETHEREUM, BNB)
  })

  test('Address without b uses the second-ranked coin when Ethereum is ranked above Bitcoin', { annotation: severity(Severity.NORMAL) }, async ({ comparePage, serveSnapshot }) => {
    await serveSnapshot(ETHEREUM_RANKED_FIRST)
    await comparePage.goto('?a=tether')

    await expectPairShown(comparePage, TETHER, BITCOIN)
  })

  for (const { query, first, second } of FALLBACK_ROWS) {
    test(`Address naming a coin not in the snapshot falls back to that choice's default: ${query}`, { annotation: severity(Severity.NORMAL) }, async ({ comparePage }) => {
      await comparePage.goto(query)

      await expectPairShown(comparePage, first, second)
      await expect(comparePage.alert).toHaveCount(0)
    })
  }

  test('Choosing a coin after a fallback replaces the unknown slug in the address', { annotation: severity(Severity.NORMAL) }, async ({ comparePage }) => {
    await comparePage.goto('?a=not-a-coin&b=tether')
    await expect(comparePage.selectedOption('first')).toHaveText(BITCOIN)

    await comparePage.choose('second', BNB)
    await expectPairInAddress(comparePage, 'bitcoin', 'bnb')
    await expectPairShown(comparePage, BITCOIN, BNB)
  })

  test('Address naming the same coin twice shows the pick-two-different-coins message', { annotation: severity(Severity.NORMAL) }, async ({ comparePage }) => {
    await comparePage.goto('?a=bnb&b=bnb')

    await expect(comparePage.alert).toHaveText(SAME_COIN_MESSAGE)
    await expect(comparePage.table).toHaveCount(0)
    await expect(comparePage.selectedOption('first')).toHaveText(BNB)
    await expect(comparePage.selectedOption('second')).toHaveText(BNB)
  })

  test('Back leaves the Compare page after several coin changes', { annotation: severity(Severity.NORMAL) }, async ({ comparePage, page }) => {
    await test.step('open Compare from the home page', async () => {
      await page.goto('#/')
      await expect(page).toHaveURL(/#\/$/)
      await comparePage.navLink.click()
      await expect(comparePage.heading).toBeVisible()
    })

    await test.step('change the coins three times', async () => {
      await comparePage.choose('first', BNB)
      await expectPairInAddress(comparePage, 'bnb', 'ethereum')
      await comparePage.choose('second', TETHER)
      await expectPairInAddress(comparePage, 'bnb', 'tether')
      await comparePage.choose('first', ETHEREUM)
      await expectPairInAddress(comparePage, 'ethereum', 'tether')
    })

    await test.step('go back once', async () => {
      await page.goBack()
      await expect(page).toHaveURL(/#\/$/)
      await expect(comparePage.heading).toHaveCount(0)
    })
  })

  test('Compare link in the main navigation opens the default pair', { annotation: severity(Severity.NORMAL) }, async ({ comparePage, page }) => {
    await page.goto('#/')
    await expect(page).toHaveURL(/#\/$/)
    await expect(comparePage.navLink).toHaveAttribute('href', '#/compare')

    await comparePage.navLink.click()
    await expect(page).toHaveURL(/#\/compare$/)
    await expect(comparePage.selectedOption('first')).toHaveText(BITCOIN)
    await expect(comparePage.selectedOption('second')).toHaveText(ETHEREUM)
  })
})

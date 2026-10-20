import { test, expect } from '@tests/coinboard/fixtures'
import { fixtureSnapshot, withoutCoinReranked } from '@tests/coinboard/data/snapshot'
import type { Locator } from '@playwright/test'
import type { ConverterPage } from '@tests/coinboard/pages/ConverterPage'
import { BITCOIN, BNB, EMPTY_AMOUNT_ERROR, ETHEREUM, MAX_AMOUNT_ERROR, NARROW_VIEWPORT, NO_RESULT, PEPE, TETHER, US_DOLLAR } from '@tests/coinboard/types'
import { Severity, severity } from '@tests/helpers/severity'

// Automates app/user-stories/converter/CNV-02-conversion-direction-can-be-swapped.test.md: one
// test per test case, with the same title and severity. The table-driven invalid-Amount case runs
// as one test per row, its title suffixed with the row's Amount.

const DEFAULT_RESULT = '1 BTC = 82,074.628 USD'
const SWAPPED_DEFAULT_RESULT = '1 USD = 0.000012184033 BTC'
const TWELVE_BTC = '12 BTC = 984,895.53 USD'
const TWELVE_USD = '12 USD = 0.0001462084 BTC'

// Stubbed snapshot, served by the test that needs it.
const WITHOUT_BITCOIN = withoutCoinReranked(fixtureSnapshot, 'bitcoin')

/** Rows of the invalid-Amount case: the Amount typed (empty clears it), then the error kept after the swap. */
const INVALID_ROWS = [
  { name: 'empty', amount: '', error: EMPTY_AMOUNT_ERROR },
  { name: '1000000001', amount: '1000000001', error: MAX_AMOUNT_ERROR },
  { name: '2.', amount: '2.', error: EMPTY_AMOUNT_ERROR },
]

/** The top edge of a laid-out element, in page pixels. */
async function topOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox()
  if (!box) throw new Error(`${locator} has no layout box`)
  return box.y
}

/** Checks From and To show the pair. */
async function expectCurrencies(converterPage: ConverterPage, from: string, to: string) {
  await expect(converterPage.selectedOption('from')).toHaveText(from)
  await expect(converterPage.selectedOption('to')).toHaveText(to)
}

/** Checks the result is fully in view, with every line of its text within a narrow viewport's width. */
async function expectResultFits(converterPage: ConverterPage) {
  await expect(converterPage.result).toBeInViewport({ ratio: 1 })
  await expect.poll(() => converterPage.resultOverflowsViewport()).toBe(false)
}

test.describe('CNV-02: Conversion direction can be swapped', { tag: ['@converter', '@CNV-02'] }, () => {
  test('User sees the Swap action on the Converter page', severity(Severity.BLOCKER), async ({ converterPage }) => {
    await converterPage.goto()

    await expect(converterPage.swap).toBeVisible()
    await expect(converterPage.swap).toBeEnabled()
    const [from, swap, to] = await Promise.all([topOf(converterPage.from), topOf(converterPage.swap), topOf(converterPage.to)])
    expect(from).toBeLessThan(swap)
    expect(swap).toBeLessThan(to)
  })

  test('Swapping the default pair converts US dollars to Bitcoin', severity(Severity.CRITICAL), async ({ converterPage }) => {
    await converterPage.goto()
    await expectCurrencies(converterPage, BITCOIN, US_DOLLAR)
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)

    await converterPage.swap.click()

    await expectCurrencies(converterPage, US_DOLLAR, BITCOIN)
    await expect(converterPage.result).toHaveText(SWAPPED_DEFAULT_RESULT)
  })

  test('Swapping keeps a changed Amount and converts it in the new direction', severity(Severity.CRITICAL), async ({ converterPage }) => {
    await converterPage.goto()
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)
    await converterPage.typeAmount('12')
    await expect(converterPage.result).toHaveText(TWELVE_BTC)

    await converterPage.swap.click()

    await expect(converterPage.amount).toHaveValue('12')
    await expectCurrencies(converterPage, US_DOLLAR, BITCOIN)
    await expect(converterPage.result).toHaveText(TWELVE_USD)
  })

  test('Swapping two coins exchanges them', severity(Severity.NORMAL), async ({ converterPage }) => {
    await converterPage.goto()
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)
    await converterPage.choose('from', BNB)
    await converterPage.choose('to', TETHER)
    await expect(converterPage.result).toHaveText('1 BNB = 730.96291 USDT')

    await converterPage.swap.click()

    await expectCurrencies(converterPage, TETHER, BNB)
    await expect(converterPage.result).toHaveText('1 USDT = 0.0013680585 BNB')
  })

  test('Swapping twice restores the original direction', severity(Severity.NORMAL), async ({ converterPage }) => {
    await converterPage.goto()
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)
    await converterPage.typeAmount('12')
    await expect(converterPage.result).toHaveText(TWELVE_BTC)

    await test.step('swap once', async () => {
      await converterPage.swap.click()
      await expect(converterPage.result).toHaveText(TWELVE_USD)
    })

    await test.step('swap back', async () => {
      await converterPage.swap.click()
      await expectCurrencies(converterPage, BITCOIN, US_DOLLAR)
      await expect(converterPage.amount).toHaveValue('12')
      await expect(converterPage.result).toHaveText(TWELVE_BTC)
    })
  })

  for (const { name, amount, error } of INVALID_ROWS) {
    test(`Swapping with an invalid Amount swaps the currencies and keeps the error: ${name}`, severity(Severity.NORMAL), async ({ converterPage }) => {
      await converterPage.goto()
      await expect(converterPage.result).toHaveText(DEFAULT_RESULT)
      await converterPage.typeAmount(amount)
      await expect(converterPage.result).toHaveText(NO_RESULT)

      await converterPage.swap.click()

      await expectCurrencies(converterPage, US_DOLLAR, BITCOIN)
      await expect(converterPage.amount).toHaveValue(amount)
      await expect(converterPage.alert).toHaveText(error)
      await expect(converterPage.amount).toHaveAttribute('aria-invalid', 'true')
      await expect(converterPage.result).toHaveText(NO_RESULT)
    })
  }

  test('Swapping the same currency on both sides changes nothing', severity(Severity.MINOR), async ({ converterPage }) => {
    await converterPage.goto()
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)
    await converterPage.choose('to', BITCOIN)
    await expect(converterPage.result).toHaveText('1 BTC = 1 BTC')

    await converterPage.swap.click()

    await expectCurrencies(converterPage, BITCOIN, BITCOIN)
    await expect(converterPage.result).toHaveText('1 BTC = 1 BTC')
    await expect(converterPage.alert).toHaveCount(0)
  })

  test('Swapping after From fell back to the top-ranked coin swaps the coin shown', severity(Severity.NORMAL), async ({ converterPage, serveSnapshot }) => {
    await serveSnapshot(WITHOUT_BITCOIN)
    await converterPage.goto()
    await expect(converterPage.selectedOption('from')).toHaveText(ETHEREUM)
    await expect(converterPage.result).toHaveText('1 ETH = 2,417.2099 USD')

    await converterPage.swap.click()

    await expectCurrencies(converterPage, US_DOLLAR, ETHEREUM)
    await expect(converterPage.result).toHaveText('1 USD = 0.00041370011 ETH')
    await expect(converterPage.alert).toHaveCount(0)
  })

  test('Swap works with Enter and Space and keeps focus', severity(Severity.NORMAL), async ({ converterPage, page }) => {
    await converterPage.goto()
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)

    await test.step('tab from From to Swap', async () => {
      await converterPage.from.focus()
      await page.keyboard.press('Tab')
      await expect(converterPage.swap).toBeFocused()
    })

    await test.step('swap with Enter', async () => {
      await page.keyboard.press('Enter')
      await expectCurrencies(converterPage, US_DOLLAR, BITCOIN)
      await expect(converterPage.result).toHaveText(SWAPPED_DEFAULT_RESULT)
      await expect(converterPage.swap).toBeFocused()
    })

    await test.step('swap with Space', async () => {
      await page.keyboard.press('Space')
      await expectCurrencies(converterPage, BITCOIN, US_DOLLAR)
      await expect(converterPage.result).toHaveText(DEFAULT_RESULT)
      await expect(converterPage.swap).toBeFocused()
    })
  })

  test('Result after a swap is in a polite live region', severity(Severity.MINOR), async ({ converterPage }) => {
    await converterPage.goto()
    await expect(converterPage.result).toHaveJSProperty('tagName', 'OUTPUT')
    await expect(converterPage.result).toHaveAttribute('aria-live', 'polite')
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)

    await converterPage.swap.click()

    await expect(converterPage.result).toHaveAttribute('aria-live', 'polite')
    await expect(converterPage.result).toHaveText(SWAPPED_DEFAULT_RESULT)
  })

  test('Double-clicking Swap swaps twice and leaves the direction unchanged', severity(Severity.MINOR), async ({ converterPage }) => {
    await converterPage.goto()
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)

    await converterPage.swap.dblclick()

    await expectCurrencies(converterPage, BITCOIN, US_DOLLAR)
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)
  })

  test("Swapping doesn't change the address and Back leaves the Converter", severity(Severity.NORMAL), async ({ converterPage, page }) => {
    await test.step('open the Converter from the home page', async () => {
      await page.goto('#/')
      await expect(page).toHaveURL(/#\/$/)
      await converterPage.navLink.click()
      await expect(page).toHaveURL(/#\/converter$/)
    })

    await test.step('swap three times', async () => {
      for (let i = 0; i < 3; i++) await converterPage.swap.click()
      await expect(converterPage.result).toHaveText(SWAPPED_DEFAULT_RESULT)
      await expect(page).toHaveURL(/#\/converter$/)
    })

    await test.step('go back once', async () => {
      await page.goBack()
      await expect(page).toHaveURL(/#\/$/)
      await expect(converterPage.heading).toHaveCount(0)
    })
  })

  test('Result fits within the page on a narrow screen in both directions', severity(Severity.MINOR), async ({ converterPage, page }) => {
    await page.setViewportSize(NARROW_VIEWPORT)
    await converterPage.goto()
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)

    await test.step('convert a billion US dollars to Pepe', async () => {
      await converterPage.choose('from', US_DOLLAR)
      await converterPage.choose('to', PEPE)
      await converterPage.typeAmount('1000000000')
      await expect(converterPage.result).toHaveText('1,000,000,000 USD = 243,957,010,000,000 PEPE')
      await expectResultFits(converterPage)
    })

    await test.step('swap', async () => {
      await converterPage.swap.click()
      await expect(converterPage.result).toHaveText('1,000,000,000 PEPE = 4,099.0829 USD')
      await expectResultFits(converterPage)
    })
  })
})

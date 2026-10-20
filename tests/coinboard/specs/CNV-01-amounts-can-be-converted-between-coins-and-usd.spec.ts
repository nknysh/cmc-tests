import { test, expect } from '@tests/coinboard/fixtures'
import { coinLabel, fixtureSnapshot, withoutCoinReranked, withTopTwoSwapped } from '@tests/coinboard/data/snapshot'
import {
  BITCOIN,
  BNB,
  EMPTY_AMOUNT_ERROR,
  ETHEREUM,
  MAX_AMOUNT_ERROR,
  NARROW_VIEWPORT,
  NO_RESULT,
  PEPE,
  TETHER,
  US_DOLLAR,
} from '@tests/coinboard/types'
import { Severity, severity } from '@tests/helpers/severity'

// Automates app/user-stories/converter/CNV-01-amounts-can-be-converted-between-coins-and-usd.test.md:
// one test per test case, with the same title and severity. Table-driven cases run as one test
// per row, their title suffixed with the row's input.

const DEFAULT_RESULT = '1 BTC = 82,074.628 USD'
const TWO_AND_A_HALF_BTC = '2.5 BTC = 205,186.57 USD'
const ETH_TO_USD = '1 ETH = 2,417.2099 USD'
const CURRENCY_LABELS = [US_DOLLAR, ...fixtureSnapshot.coins.map(coinLabel)]
const LAST_COIN = 'Bitcoin SV (BSV)'

// Stubbed snapshots, served by the tests that need them.
const ETHEREUM_RANKED_FIRST = withTopTwoSwapped(fixtureSnapshot)
const WITHOUT_BITCOIN = withoutCoinReranked(fixtureSnapshot, 'bitcoin')

/** Rows of the same-currency case. */
const SAME_CURRENCY_ROWS = [
  { amount: '2.5', currency: BITCOIN, result: '2.5 BTC = 2.5 BTC' },
  { amount: '1', currency: US_DOLLAR, result: '1 USD = 1 USD' },
]

/** Rows of the typed-characters case: keys typed after `2.5`, then the Amount and result they leave. */
const TYPED_ROWS = [
  { keys: '-', amount: '2.5', result: TWO_AND_A_HALF_BTC },
  { keys: '+', amount: '2.5', result: TWO_AND_A_HALF_BTC },
  { keys: 'e3', amount: '2.53', result: '2.53 BTC = 207,648.81 USD' },
  { keys: ',', amount: '2.5', result: TWO_AND_A_HALF_BTC },
  { keys: 'a', amount: '2.5', result: TWO_AND_A_HALF_BTC },
  { keys: ' ', amount: '2.5', result: TWO_AND_A_HALF_BTC },
  { keys: '.', amount: '2.5', result: TWO_AND_A_HALF_BTC },
]

/** Rows of the paste case: text pasted over an Amount of `1`, then the Amount and result it leaves. */
const PASTE_ROWS = [
  { text: '-5', amount: '1', result: DEFAULT_RESULT },
  { text: '1e3', amount: '1', result: DEFAULT_RESULT },
  { text: '1,000', amount: '1', result: DEFAULT_RESULT },
  { text: '2.5.1', amount: '1', result: DEFAULT_RESULT },
  { text: ' 2.5', amount: '1', result: DEFAULT_RESULT },
  { text: '2.5', amount: '2.5', result: TWO_AND_A_HALF_BTC },
]

// Rows of the max-boundary case, split by outcome so each test has one straight path.
const MAX_VALID_ROWS = ['1000000000', '1000000000.0']
const MAX_INVALID_ROWS = ['1000000000.00000001', '1000000001', '99999999999']

/** Rows of the incomplete-Amount case. */
const INCOMPLETE_ROWS = [
  { incomplete: '2.', completed: '2.5', result: TWO_AND_A_HALF_BTC },
  { incomplete: '.', completed: '.5', result: '0.5 BTC = 41,037.314 USD' },
]

/** A row's keys for a test title, so a space or a dot stays readable. */
const shown = (keys: string) => `"${keys}"`

test.describe('CNV-01: Amounts can be converted between coins and USD', { tag: ['@converter', '@CNV-01'] }, () => {
  test('User sees the Converter page with Amount, From and To', { annotation: severity(Severity.BLOCKER) }, async ({ converterPage }) => {
    await converterPage.goto()

    await expect(converterPage.heading).toBeVisible()
    await expect(converterPage.amount).toBeVisible()
    await expect(converterPage.from).toBeVisible()
    await expect(converterPage.to).toBeVisible()
    await expect(converterPage.result).toBeVisible()
  })

  test('User sees 1 Bitcoin converted to US dollars by default', { annotation: severity(Severity.CRITICAL) }, async ({ converterPage }) => {
    await converterPage.goto()

    await expect(converterPage.amount).toHaveValue('1')
    await expect(converterPage.selectedOption('from')).toHaveText(BITCOIN)
    await expect(converterPage.selectedOption('to')).toHaveText(US_DOLLAR)
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)
    await expect(converterPage.alert).toHaveCount(0)
  })

  test('Default From follows the ranking when Ethereum is ranked above Bitcoin', { annotation: severity(Severity.NORMAL) }, async ({ converterPage, serveSnapshot }) => {
    await serveSnapshot(ETHEREUM_RANKED_FIRST)
    await converterPage.goto()

    await expect(converterPage.selectedOption('from')).toHaveText(ETHEREUM)
    await expect(converterPage.selectedOption('to')).toHaveText(US_DOLLAR)
    await expect(converterPage.result).toHaveText(ETH_TO_USD)
  })

  test('Default From falls back to the top-ranked coin when Bitcoin is not in the snapshot', { annotation: severity(Severity.NORMAL) }, async ({ converterPage, serveSnapshot }) => {
    await serveSnapshot(WITHOUT_BITCOIN)
    await converterPage.goto()

    await expect(converterPage.selectedOption('from')).toHaveText(ETHEREUM)
    await expect(converterPage.from.getByRole('option', { name: BITCOIN, exact: true })).toHaveCount(0)
    await expect(converterPage.to.getByRole('option', { name: BITCOIN, exact: true })).toHaveCount(0)
    await expect(converterPage.result).toHaveText(ETH_TO_USD)
    await expect(converterPage.alert).toHaveCount(0)
  })

  test('From and To offer US Dollar first, then every snapshot coin in rank order', { annotation: severity(Severity.NORMAL) }, async ({ converterPage }) => {
    await converterPage.goto()
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)

    await test.step('From offers US Dollar, then every snapshot coin', async () => {
      const options = converterPage.options('from')
      await expect(options).toHaveText(CURRENCY_LABELS)
      await expect(options.first()).toHaveText(US_DOLLAR)
      await expect(options.nth(1)).toHaveText(BITCOIN)
      await expect(options.nth(2)).toHaveText(ETHEREUM)
      await expect(options.nth(3)).toHaveText(TETHER)
      await expect(options.nth(4)).toHaveText(BNB)
      await expect(options.last()).toHaveText(LAST_COIN)
    })

    await test.step('To offers the same currencies in the same order', async () => {
      await expect(converterPage.options('to')).toHaveText(CURRENCY_LABELS)
    })
  })

  test('User can convert between two coins', { annotation: severity(Severity.CRITICAL) }, async ({ converterPage }) => {
    await converterPage.goto()
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)

    await converterPage.choose('to', ETHEREUM)

    await expect(converterPage.result).toHaveText('1 BTC = 33.954283 ETH')
  })

  test('User can convert a decimal amount', { annotation: severity(Severity.CRITICAL) }, async ({ converterPage }) => {
    await converterPage.goto()
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)

    await converterPage.typeAmount('2.5')

    await expect(converterPage.result).toHaveText(TWO_AND_A_HALF_BTC)
    await expect(converterPage.amount).toHaveAttribute('aria-invalid', 'false')
  })

  test('Converting US dollars to a coin shows a small result in plain digits', { annotation: severity(Severity.NORMAL) }, async ({ converterPage }) => {
    await converterPage.goto()
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)

    await converterPage.choose('from', US_DOLLAR)
    await converterPage.choose('to', BITCOIN)

    await expect(converterPage.result).toHaveText('1 USD = 0.000012184033 BTC')
  })

  test('Large amounts round to 8 significant digits with thousands separators', { annotation: severity(Severity.NORMAL) }, async ({ converterPage }) => {
    await converterPage.goto()
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)

    await converterPage.typeAmount('123456789')

    await expect(converterPage.result).toHaveText('123,456,790 BTC = 10,132,670,000,000 USD')
    await expect(converterPage.amount).toHaveValue('123456789')
  })

  test('Tiny amounts and results show in plain digits, not scientific notation', { annotation: severity(Severity.MINOR) }, async ({ converterPage }) => {
    await converterPage.goto()
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)

    await converterPage.choose('from', PEPE)
    await converterPage.typeAmount('0.00000001')

    await expect(converterPage.result).toHaveText('0.00000001 PEPE = 0.000000000000040990829 USD')
    await expect(converterPage.result).not.toHaveText(/\de[+-]?\d/i)
  })

  test('Result updates at once when Amount, From or To changes', { annotation: severity(Severity.CRITICAL) }, async ({ converterPage, page }) => {
    await test.step('open the default conversion', async () => {
      await converterPage.goto()
      await expect(converterPage.result).toHaveText(DEFAULT_RESULT)
      await expect(page.getByRole('button', { name: /^(convert|submit|apply)$/i })).toHaveCount(0)
    })

    await test.step('change Amount', async () => {
      await converterPage.typeAmount('5')
      await expect(converterPage.result).toHaveText('5 BTC = 410,373.14 USD')
    })

    await test.step('change To', async () => {
      await converterPage.choose('to', ETHEREUM)
      await expect(converterPage.result).toHaveText('5 BTC = 169.77141 ETH')
    })

    await test.step('change From', async () => {
      await converterPage.choose('from', BNB)
      await expect(converterPage.result).toHaveText('5 BNB = 1.51045 ETH')
    })
  })

  for (const { amount, currency, result } of SAME_CURRENCY_ROWS) {
    test(`Converting a currency to itself gives the same amount: ${currency}`, { annotation: severity(Severity.NORMAL) }, async ({ converterPage }) => {
      await converterPage.goto()
      await expect(converterPage.result).toHaveText(DEFAULT_RESULT)

      await converterPage.typeAmount(amount)
      await converterPage.choose('from', currency)
      await converterPage.choose('to', currency)

      await expect(converterPage.selectedOption('from')).toHaveText(currency)
      await expect(converterPage.selectedOption('to')).toHaveText(currency)
      await expect(converterPage.result).toHaveText(result)
      await expect(converterPage.alert).toHaveCount(0)
    })
  }

  test('Amount of zero converts to zero without an error', { annotation: severity(Severity.NORMAL) }, async ({ converterPage }) => {
    await converterPage.goto()
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)

    await converterPage.typeAmount('0')

    await expect(converterPage.result).toHaveText('0 BTC = 0 USD')
    await expect(converterPage.alert).toHaveCount(0)
    await expect(converterPage.amount).toHaveAttribute('aria-invalid', 'false')
  })

  test('Empty Amount shows an error and no result until a value is entered', { annotation: severity(Severity.CRITICAL) }, async ({ converterPage }) => {
    await converterPage.goto()
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)

    await test.step('clear Amount', async () => {
      await converterPage.amount.clear()
      await expect(converterPage.amount).toBeFocused()
      await expect(converterPage.alert).toHaveText(EMPTY_AMOUNT_ERROR)
      await expect(converterPage.amount).toHaveAttribute('aria-invalid', 'true')
      await expect(converterPage.amount).toHaveAccessibleDescription(EMPTY_AMOUNT_ERROR)
      await expect(converterPage.result).toHaveText(NO_RESULT)
    })

    await test.step('type a valid Amount', async () => {
      await converterPage.typeAmount('3')
      await expect(converterPage.alert).toHaveCount(0)
      await expect(converterPage.amount).toHaveAttribute('aria-invalid', 'false')
      await expect(converterPage.result).toHaveText('3 BTC = 246,223.88 USD')
    })
  })

  test('Amount and currencies reset to the defaults after leaving the page', { annotation: severity(Severity.NORMAL) }, async ({ converterPage, page }) => {
    await converterPage.goto()
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)

    await test.step('change Amount, From and To', async () => {
      await converterPage.typeAmount('5')
      await converterPage.choose('from', ETHEREUM)
      await converterPage.choose('to', TETHER)
      await expect(converterPage.result).toHaveText('5 ETH = 12,098.429 USDT')
    })

    await test.step('go to Markets and back', async () => {
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Markets', exact: true }).click()
      await expect(page).toHaveURL(/#\/$/)
      await converterPage.navLink.click()
    })

    await test.step('the defaults are back', async () => {
      await expect(converterPage.amount).toHaveValue('1')
      await expect(converterPage.selectedOption('from')).toHaveText(BITCOIN)
      await expect(converterPage.selectedOption('to')).toHaveText(US_DOLLAR)
      await expect(converterPage.result).toHaveText(DEFAULT_RESULT)
    })
  })

  for (const { keys, amount, result } of TYPED_ROWS) {
    test(`Typed characters other than digits and one decimal point are ignored: ${shown(keys)}`, { annotation: severity(Severity.NORMAL) }, async ({ converterPage }) => {
      await converterPage.goto()
      await expect(converterPage.result).toHaveText(DEFAULT_RESULT)
      await converterPage.typeAmount('2.5')
      await expect(converterPage.result).toHaveText(TWO_AND_A_HALF_BTC)

      await converterPage.amount.pressSequentially(keys)

      await expect(converterPage.amount).toHaveValue(amount)
      await expect(converterPage.result).toHaveText(result)
      await expect(converterPage.alert).toHaveCount(0)
    })
  }

  for (const { text, amount, result } of PASTE_ROWS) {
    test(`Pasting text with characters other than digits and a decimal point leaves Amount unchanged: ${shown(text)}`, { annotation: severity(Severity.NORMAL) }, async ({ converterPage }) => {
      await converterPage.goto()
      await expect(converterPage.amount).toHaveValue('1')

      await converterPage.pasteAmount(text)

      await expect(converterPage.amount).toHaveValue(amount)
      await expect(converterPage.result).toHaveText(result)
      await expect(converterPage.alert).toHaveCount(0)
    })
  }

  for (const amount of MAX_VALID_ROWS) {
    test(`Amount above one billion shows the max error: ${amount}`, { annotation: severity(Severity.NORMAL) }, async ({ converterPage }) => {
      await converterPage.goto()
      await expect(converterPage.result).toHaveText(DEFAULT_RESULT)

      await converterPage.typeAmount(amount)

      await expect(converterPage.result).toHaveText('1,000,000,000 BTC = 82,074,628,000,000 USD')
      await expect(converterPage.alert).toHaveCount(0)
      await expect(converterPage.amount).toHaveAttribute('aria-invalid', 'false')
    })
  }

  for (const amount of MAX_INVALID_ROWS) {
    test(`Amount above one billion shows the max error: ${amount}`, { annotation: severity(Severity.NORMAL) }, async ({ converterPage }) => {
      await converterPage.goto()
      await expect(converterPage.result).toHaveText(DEFAULT_RESULT)

      await converterPage.typeAmount(amount)

      await expect(converterPage.result).toHaveText(NO_RESULT)
      await expect(converterPage.alert).toHaveText(MAX_AMOUNT_ERROR)
      await expect(converterPage.amount).toHaveAttribute('aria-invalid', 'true')
      await expect(converterPage.amount).toHaveAccessibleDescription(MAX_AMOUNT_ERROR)
    })
  }

  for (const { incomplete, completed, result } of INCOMPLETE_ROWS) {
    test(`Incomplete Amount shows no result while typing and the error once focus leaves: ${shown(incomplete)}`, { annotation: severity(Severity.NORMAL) }, async ({ converterPage }) => {
      await converterPage.goto()
      await expect(converterPage.result).toHaveText(DEFAULT_RESULT)

      await test.step('type the incomplete Amount', async () => {
        await converterPage.typeAmount(incomplete)
        await expect(converterPage.result).toHaveText(NO_RESULT)
        await expect(converterPage.alert).toHaveCount(0)
        await expect(converterPage.amount).toHaveAttribute('aria-invalid', 'false')
      })

      await test.step('leave Amount', async () => {
        await converterPage.amount.press('Tab')
        await expect(converterPage.alert).toHaveText(EMPTY_AMOUNT_ERROR)
        await expect(converterPage.amount).toHaveAttribute('aria-invalid', 'true')
        await expect(converterPage.result).toHaveText(NO_RESULT)
      })

      await test.step('complete the Amount', async () => {
        await converterPage.amount.focus()
        await converterPage.amount.press('End')
        await converterPage.amount.press('5')
        await expect(converterPage.amount).toHaveValue(completed)
        await expect(converterPage.alert).toHaveCount(0)
        await expect(converterPage.result).toHaveText(result)
      })
    })
  }

  test('Long result wraps within the page on a narrow screen', { annotation: severity(Severity.MINOR) }, async ({ converterPage, page }) => {
    await page.setViewportSize(NARROW_VIEWPORT)
    await converterPage.goto()
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)

    await converterPage.choose('from', US_DOLLAR)
    await converterPage.choose('to', PEPE)
    await converterPage.typeAmount('1000000000')

    await expect(converterPage.result).toHaveText('1,000,000,000 USD = 243,957,010,000,000 PEPE')
    await expect(converterPage.result).toBeInViewport({ ratio: 1 })
    await expect.poll(() => converterPage.resultOverflowsViewport()).toBe(false)
    await expect.poll(() => converterPage.resultLineCount()).toBeGreaterThan(1)
  })

  test('Converter can be used from the keyboard and announces changes', { annotation: severity(Severity.NORMAL) }, async ({ converterPage, page }) => {
    await converterPage.goto()
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)
    await expect(converterPage.result).toHaveJSProperty('tagName', 'OUTPUT')
    await expect(converterPage.result).toHaveAttribute('aria-live', 'polite')

    await test.step('empty and refill Amount with keys', async () => {
      await converterPage.amount.focus()
      await page.keyboard.press('End')
      await page.keyboard.press('Backspace')
      await expect(converterPage.alert).toHaveText(EMPTY_AMOUNT_ERROR)
      await page.keyboard.press('1')
      await expect(converterPage.alert).toHaveCount(0)
    })

    await test.step('choose From by type-ahead', async () => {
      await page.keyboard.press('Tab')
      await expect(converterPage.from).toBeFocused()
      await page.keyboard.press('E')
      await expect(converterPage.selectedOption('from')).toHaveText(ETHEREUM)
      await expect(converterPage.result).toHaveText(ETH_TO_USD)
    })

    await test.step('choose To by type-ahead', async () => {
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await expect(converterPage.to).toBeFocused()
      await page.keyboard.press('T')
      await expect(converterPage.selectedOption('to')).toHaveText(TETHER)
      await expect(converterPage.result).toHaveText('1 ETH = 2,419.6858 USDT')
    })
  })

  test('Pressing Enter in Amount keeps the Converter open', { annotation: severity(Severity.NORMAL) }, async ({ converterPage, page }) => {
    await converterPage.goto()
    await expect(converterPage.result).toHaveText(DEFAULT_RESULT)
    await converterPage.typeAmount('2.5')
    await expect(converterPage.result).toHaveText(TWO_AND_A_HALF_BTC)

    // A reload drops this marker; the listener records whether the form's submit was cancelled.
    await page.evaluate(() => {
      Reflect.set(window, 'cnvMarker', true)
      window.addEventListener('submit', (event) => Reflect.set(window, 'cnvSubmit', event.defaultPrevented ? 'prevented' : 'allowed'))
    })
    await converterPage.amount.press('Enter')

    await expect.poll(() => page.evaluate(() => Reflect.get(window, 'cnvSubmit'))).toBe('prevented')
    await expect(page).toHaveURL(/#\/converter$/)
    await expect.poll(() => page.evaluate(() => Reflect.get(window, 'cnvMarker'))).toBe(true)
    await expect(converterPage.amount).toHaveValue('2.5')
    await expect(converterPage.result).toHaveText(TWO_AND_A_HALF_BTC)
  })
})

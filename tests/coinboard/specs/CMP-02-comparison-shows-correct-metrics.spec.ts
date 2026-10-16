import { test, expect } from '@tests/coinboard/fixtures'
import { fixtureSnapshot, withCoinChanged } from '@tests/coinboard/data/snapshot'
import type { CoinPage, ChangePeriod } from '@tests/coinboard/pages/CoinPage'
import type { ComparePage, Side } from '@tests/coinboard/pages/ComparePage'
import { Severity, severity } from '@tests/helpers/severity'

// Automates app/user-stories/compare/CMP-02-comparison-shows-correct-metrics.test.md:
// one test per test case, with the same title and severity.

const METRICS = [
  'Rank',
  'Price',
  'Market cap',
  'Volume (24h)',
  '1h change',
  '24h change',
  '7d change',
  '30d change',
  'Circulating supply',
  'Max supply',
] as const
type Metric = (typeof METRICS)[number]

const CHANGE_PERIODS: ChangePeriod[] = ['1h', '24h', '7d', '30d']
const changeMetric = (period: ChangePeriod): Metric => `${period} change`
const CHANGE_STATES = ['up', 'down', 'flat']

const NO_MAX_SUPPLY = '∞'

// Stubbed snapshot, served by the test that needs it.
const BITCOIN_FLAT_1H = withCoinChanged(fixtureSnapshot, 'bitcoin', { percentChange1h: 0 })

interface CoinColumn {
  values: Record<Metric, string>
  states: Record<ChangePeriod, string>
}

/** Reads one coin's 10 values from the comparison, and the up/down/flat state of its 4 change cells. */
async function readColumn(comparePage: ComparePage, side: Side): Promise<CoinColumn> {
  const values = {} as Record<Metric, string>
  for (const metric of METRICS) {
    values[metric] = (await comparePage.cell(metric, side).textContent())?.trim() ?? ''
  }
  const states = {} as Record<ChangePeriod, string>
  for (const period of CHANGE_PERIODS) {
    const classes = (await comparePage.cell(changeMetric(period), side).getAttribute('class'))?.split(' ') ?? []
    states[period] = classes.find((name) => CHANGE_STATES.includes(name)) ?? ''
  }
  return { values, states }
}

/** Checks the details page against the values read from the comparison. Max supply is checked by the caller. */
async function expectDetailsMatch(coinPage: CoinPage, { values, states }: CoinColumn, symbol: string) {
  await expect(coinPage.rankBadge).toHaveText(`Rank ${values.Rank}`)
  await expect(coinPage.price).toHaveText(values.Price)
  await expect(coinPage.stat('Market cap')).toHaveText(values['Market cap'])
  await expect(coinPage.stat('Volume (24h)')).toHaveText(values['Volume (24h)'])
  for (const period of CHANGE_PERIODS) {
    await expect(coinPage.change(period, values[changeMetric(period)])).toContainClass(states[period])
  }
  await expect(coinPage.stat('Circulating supply')).toHaveText(`${values['Circulating supply']} ${symbol}`)
}

test.describe('CMP-02: Comparison shows correct metrics', { tag: ['@compare', '@CMP-02'] }, () => {
  test('Comparison lists the ten metrics in the specified order', { annotation: severity(Severity.CRITICAL) }, async ({ comparePage }) => {
    await comparePage.goto()

    await expect(comparePage.bodyRows()).toHaveCount(METRICS.length)
    await expect(comparePage.rowHeaders()).toHaveText([...METRICS])
    for (const metric of METRICS) {
      await expect(comparePage.cell(metric, 'first')).toHaveText(/\S/)
      await expect(comparePage.cell(metric, 'second')).toHaveText(/\S/)
    }
  })

  test('Rank shows as a hash sign followed by the rank number', { annotation: severity(Severity.NORMAL) }, async ({ comparePage }) => {
    await comparePage.goto('?a=bnb&b=tether')

    await expect(comparePage.cell('Rank', 'first')).toHaveText('#4')
    await expect(comparePage.cell('Rank', 'second')).toHaveText('#3')
  })

  test('Price of one dollar or more shows in price format', { annotation: severity(Severity.CRITICAL) }, async ({ comparePage }) => {
    await comparePage.goto()

    await expect(comparePage.cell('Price', 'first')).toHaveText('$82,074.63')
    await expect(comparePage.cell('Price', 'second')).toHaveText('$2,417.21')
  })

  test('Price below one dollar shows four significant digits', { annotation: severity(Severity.NORMAL) }, async ({ comparePage }) => {
    await comparePage.goto('?a=tether&b=bitcoin')

    await expect(comparePage.cell('Price', 'first')).toHaveText('$0.999')
    await expect(comparePage.cell('Price', 'second')).toHaveText('$82,074.63')
  })

  test('Price below one cent keeps four significant digits after the leading zeros', { annotation: severity(Severity.NORMAL) }, async ({ comparePage }) => {
    await comparePage.goto('?a=pepe&b=tron')

    await expect(comparePage.cell('Price', 'first')).toHaveText('$0.000004099')
    await expect(comparePage.cell('Price', 'second')).toHaveText('$0.3302')
  })

  test('Market cap and 24h volume show in compact USD', { annotation: severity(Severity.NORMAL) }, async ({ comparePage }) => {
    await comparePage.goto()

    await expect(comparePage.cell('Market cap', 'first')).toHaveText('$1.65T')
    await expect(comparePage.cell('Market cap', 'second')).toHaveText('$295.23B')
    await expect(comparePage.cell('Volume (24h)', 'first')).toHaveText('$41.83B')
    await expect(comparePage.cell('Volume (24h)', 'second')).toHaveText('$18.63B')
  })

  test('Values below one billion show in millions in compact USD', { annotation: severity(Severity.NORMAL) }, async ({ comparePage }) => {
    await comparePage.goto('?a=pepe&b=tron')

    await expect(comparePage.cell('Volume (24h)', 'first')).toHaveText('$297.73M')
    await expect(comparePage.cell('Volume (24h)', 'second')).toHaveText('$541.8M')
    await expect(comparePage.cell('Market cap', 'first')).toHaveText('$1.7B')
  })

  test('Positive change shows a plus sign and the up state', { annotation: severity(Severity.NORMAL) }, async ({ comparePage }) => {
    await comparePage.goto('?a=bitcoin&b=tether')

    await expect(comparePage.cell('1h change', 'first')).toHaveText('+1.49%')
    await expect(comparePage.cell('1h change', 'first')).toContainClass('up')
    await expect(comparePage.cell('30d change', 'first')).toHaveText('+8.00%')
    await expect(comparePage.cell('30d change', 'first')).toContainClass('up')
    await expect(comparePage.cell('24h change', 'second')).toHaveText('+0.00%')
    await expect(comparePage.cell('24h change', 'second')).toContainClass('up')
  })

  test('Negative change shows a minus sign and the down state', { annotation: severity(Severity.NORMAL) }, async ({ comparePage }) => {
    await comparePage.goto()

    await expect(comparePage.cell('7d change', 'first')).toHaveText('-0.27%')
    await expect(comparePage.cell('7d change', 'first')).toContainClass('down')
    await expect(comparePage.cell('24h change', 'second')).toHaveText('-0.22%')
    await expect(comparePage.cell('24h change', 'second')).toContainClass('down')
    await expect(comparePage.cell('7d change', 'second')).toHaveText('-3.83%')
    await expect(comparePage.cell('7d change', 'second')).toContainClass('down')
  })

  test('Negative change that rounds to zero shows -0.00% and the down state', { annotation: severity(Severity.MINOR) }, async ({ comparePage }) => {
    await comparePage.goto('?a=paypal-usd&b=bitcoin')

    await expect(comparePage.cell('1h change', 'first')).toHaveText('-0.00%')
    await expect(comparePage.cell('1h change', 'first')).toContainClass('down')
  })

  test('Exactly zero change shows 0.00% and the flat state', { annotation: severity(Severity.MINOR) }, async ({ comparePage, serveSnapshot }) => {
    await serveSnapshot(BITCOIN_FLAT_1H)
    await comparePage.goto()

    await expect(comparePage.cell('1h change', 'first')).toHaveText('0.00%')
    await expect(comparePage.cell('1h change', 'first')).toContainClass('flat')
    await expect(comparePage.cell('1h change', 'second')).toHaveText('+1.90%')
    await expect(comparePage.cell('1h change', 'second')).toContainClass('up')
  })

  test('Supplies show rounded whole numbers with thousands separators and no symbol', { annotation: severity(Severity.NORMAL) }, async ({ comparePage }) => {
    await comparePage.goto('?a=bitcoin&b=bnb')

    await expect(comparePage.cell('Circulating supply', 'first')).toHaveText('20,098,671')
    await expect(comparePage.cell('Max supply', 'first')).toHaveText('21,000,000')
    await expect(comparePage.cell('Circulating supply', 'second')).toHaveText('133,158,496')
    await expect(comparePage.cell('Max supply', 'second')).toHaveText('133,158,496')
    for (const side of ['first', 'second'] as const) {
      for (const metric of ['Circulating supply', 'Max supply']) {
        await expect(comparePage.cell(metric, side)).not.toContainText(/BTC|BNB|\./)
      }
    }
  })

  test('Coin without a max supply shows Max supply as infinity', { annotation: severity(Severity.NORMAL) }, async ({ comparePage }) => {
    await comparePage.goto()

    await expect(comparePage.cell('Max supply', 'second')).toHaveText(NO_MAX_SUPPLY)
    await expect(comparePage.cell('Max supply', 'first')).toHaveText('21,000,000')
  })

  test('Every Bitcoin value in the comparison matches the Bitcoin details page', { annotation: severity(Severity.CRITICAL) }, async ({ comparePage, coinPage }) => {
    const bitcoin = await test.step('read the Bitcoin column of the comparison', async () => {
      await comparePage.goto('?a=bitcoin&b=tether')
      await expect(comparePage.coinHeader('first')).toHaveText('Bitcoin')
      const column = await readColumn(comparePage, 'first')
      expect(Object.values(column.values).filter(Boolean)).toHaveLength(METRICS.length)
      return column
    })

    await test.step('compare it with the Bitcoin details page', async () => {
      await coinPage.goto('bitcoin')
      await expect(coinPage.heading).toHaveText(/^Bitcoin/)
      await expectDetailsMatch(coinPage, bitcoin, 'BTC')
      await expect(coinPage.stat('Max supply')).toHaveText(`${bitcoin.values['Max supply']} BTC`)
    })
  })

  test('Every Tether USDt value in the comparison matches the Tether USDt details page', { annotation: severity(Severity.CRITICAL) }, async ({ comparePage, coinPage }) => {
    const tether = await test.step('read the Tether USDt column of the comparison', async () => {
      await comparePage.goto('?a=bitcoin&b=tether')
      await expect(comparePage.coinHeader('second')).toHaveText('Tether USDt')
      const column = await readColumn(comparePage, 'second')
      expect(Object.values(column.values).filter(Boolean)).toHaveLength(METRICS.length)
      return column
    })

    await test.step('compare it with the Tether USDt details page', async () => {
      await coinPage.goto('tether')
      await expect(coinPage.heading).toHaveText(/^Tether USDt/)
      await expectDetailsMatch(coinPage, tether, 'USDT')
      expect(tether.values['Max supply']).toBe(NO_MAX_SUPPLY)
      await expect(coinPage.stat('Max supply')).toHaveText(NO_MAX_SUPPLY)
    })
  })
})

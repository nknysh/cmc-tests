import type { TestDetailsAnnotation } from '@playwright/test'
import { Severity } from 'allure-js-commons'

export { Severity }

/**
 * Playwright annotation that allure-playwright turns into the test's Allure
 * `severity` label. Every test declares one: the quality gate in allurerc.mjs
 * fails CI on any blocker/critical failure but tolerates a few at lower levels.
 */
export const severity = (level: Severity): TestDetailsAnnotation => ({
  type: 'allure.label.severity',
  description: level,
})

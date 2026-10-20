import type { TestDetails, TestDetailsAnnotation } from '@playwright/test'
import { Severity } from 'allure-js-commons'

export { Severity }

/**
 * Test details declaring a test's severity. allure-playwright turns the annotation into the
 * test's Allure `severity` label; the quality gate in allurerc.mjs fails CI on any
 * blocker/critical failure but tolerates a few at lower levels. The matching tag (`@blocker`,
 * `@critical`, ...) lets a run select tests by severity with `--grep`, as the CoinBoard smoke
 * workflow does. Extra annotations (e.g. a test-case id) are passed after the level.
 */
export const severity = (level: Severity, ...annotations: TestDetailsAnnotation[]): TestDetails => ({
  tag: `@${level}`,
  annotation: [{ type: 'allure.label.severity', description: level }, ...annotations],
})

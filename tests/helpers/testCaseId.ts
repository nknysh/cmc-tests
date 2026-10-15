import { test } from '@playwright/test'
import * as allure from 'allure-js-commons'

const TEST_CASE_ID_ANNOTATION = 'test-case-id'

/**
 * Registers a beforeEach that maps each test to its source test case in
 * data/test-cases.db (see src/db/testCases/) via its `test-case-id`
 * annotation, which matches that database's `test_cases.id`. The same id is
 * used as the test's Allure id, testCaseId and historyId, so Allure history
 * survives renames of a test or its suite. Call it inside the describe whose
 * tests carry the annotation. With `required: false`, tests without one are
 * left alone, for suites that mix mapped and unmapped tests.
 */
export function useTestCaseIds({ required = true }: { required?: boolean } = {}): void {
  test.beforeEach(async ({}, testInfo) => {
    const testCaseId = testInfo.annotations.find((a) => a.type === TEST_CASE_ID_ANNOTATION)?.description
    if (!testCaseId) {
      if (required) throw new Error(`every test needs a ${TEST_CASE_ID_ANNOTATION} annotation`)
      return
    }
    await allure.allureId(testCaseId)
    await allure.testCaseId(`test-case-${testCaseId}`)
    await allure.historyId(`test-case-${testCaseId}`)
  })
}

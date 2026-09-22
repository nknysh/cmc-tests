export interface TestStep {
  action: string
  expectedOutput: string
}

export interface TestCase {
  id: number
  name: string
  preconditions: string | null
  suiteId: number | null
  steps: TestStep[]
}

export interface TestSuite {
  id: number
  name: string
  parentId: number | null
}

export interface TestSuiteNode extends TestSuite {
  children: TestSuiteNode[]
}

export interface TestCaseStoreOptions {
  /** Path to the SQLite file, or ':memory:'. Defaults to 'data/test-cases.db'. */
  dbPath?: string
}

export interface CreateSuiteInput {
  name: string
  parentId?: number | null
}

export interface CreateTestCaseInput {
  name: string
  preconditions?: string | null
  suiteId?: number | null
  steps: TestStep[]
}

export interface UpdateTestCaseInput {
  name?: string
  preconditions?: string | null
  suiteId?: number | null
  steps?: TestStep[]
}

/** Raw row shapes as returned by node:sqlite — snake_case, internal only. */
export interface TestSuiteRow {
  id: number
  name: string
  parent_id: number | null
}

export interface TestCaseRow {
  id: number
  suite_id: number | null
  name: string
  preconditions: string | null
}

export interface TestCaseStepRow {
  id: number
  test_case_id: number
  step_order: number
  action: string
  expected_output: string
}

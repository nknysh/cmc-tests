import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { SCHEMA_SQL } from './schema'
import type {
  CreateSuiteInput,
  CreateTestCaseInput,
  TestCase,
  TestCaseRow,
  TestCaseStepRow,
  TestCaseStoreOptions,
  TestStep,
  TestSuite,
  TestSuiteNode,
  TestSuiteRow,
  UpdateTestCaseInput,
} from './types'

const DEFAULT_DB_PATH = 'data/test-cases.db'

function toSuite(row: TestSuiteRow): TestSuite {
  return { id: row.id, name: row.name, parentId: row.parent_id }
}

function toStep(row: TestCaseStepRow): TestStep {
  return { action: row.action, expectedOutput: row.expected_output }
}

export class TestCaseStore {
  private readonly db: DatabaseSync

  constructor({ dbPath = DEFAULT_DB_PATH }: TestCaseStoreOptions = {}) {
    if (dbPath !== ':memory:') {
      mkdirSync(dirname(resolve(dbPath)), { recursive: true })
    }
    this.db = new DatabaseSync(dbPath)
    this.db.exec(SCHEMA_SQL)
  }

  createSuite({ name, parentId = null }: CreateSuiteInput): TestSuite {
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO test_suites (name, parent_id) VALUES (?, ?)')
      .run(name, parentId)

    return this.getSuite(Number(lastInsertRowid))!
  }

  getSuite(id: number): TestSuite | undefined {
    const row = this.db.prepare('SELECT * FROM test_suites WHERE id = ?').get(id) as
      | TestSuiteRow
      | undefined

    return row ? toSuite(row) : undefined
  }

  deleteSuite(id: number): void {
    this.db.prepare('DELETE FROM test_suites WHERE id = ?').run(id)
  }

  /** Returns the full suite hierarchy as a forest of root suites with nested children. */
  getSuiteTree(): TestSuiteNode[] {
    const rows = this.db
      .prepare('SELECT * FROM test_suites ORDER BY parent_id, name')
      .all() as unknown as TestSuiteRow[]

    const nodesById = new Map<number, TestSuiteNode>()
    for (const row of rows) {
      nodesById.set(row.id, { ...toSuite(row), children: [] })
    }

    const roots: TestSuiteNode[] = []
    for (const row of rows) {
      const node = nodesById.get(row.id)!
      if (row.parent_id === null) {
        roots.push(node)
      } else {
        nodesById.get(row.parent_id)?.children.push(node)
      }
    }

    return roots
  }

  createTestCase({ name, preconditions = null, suiteId = null, steps }: CreateTestCaseInput): TestCase {
    this.db.exec('BEGIN')
    try {
      const { lastInsertRowid } = this.db
        .prepare('INSERT INTO test_cases (name, preconditions, suite_id) VALUES (?, ?, ?)')
        .run(name, preconditions, suiteId)

      const testCaseId = Number(lastInsertRowid)
      this.insertSteps(testCaseId, steps)
      this.db.exec('COMMIT')

      return this.getTestCase(testCaseId)!
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  getTestCase(id: number): TestCase | undefined {
    const row = this.db.prepare('SELECT * FROM test_cases WHERE id = ?').get(id) as
      | TestCaseRow
      | undefined

    return row ? this.hydrateTestCase(row) : undefined
  }

  listTestCasesBySuite(suiteId: number): TestCase[] {
    const rows = this.db
      .prepare('SELECT * FROM test_cases WHERE suite_id = ? ORDER BY name')
      .all(suiteId) as unknown as TestCaseRow[]

    return rows.map((row) => this.hydrateTestCase(row))
  }

  updateTestCase(id: number, { name, preconditions, suiteId, steps }: UpdateTestCaseInput): TestCase {
    this.db.exec('BEGIN')
    try {
      const current = this.db.prepare('SELECT * FROM test_cases WHERE id = ?').get(id) as
        | TestCaseRow
        | undefined
      if (!current) throw new Error(`TestCaseStore: no test case with id ${id}`)

      this.db
        .prepare('UPDATE test_cases SET name = ?, preconditions = ?, suite_id = ? WHERE id = ?')
        .run(
          name ?? current.name,
          preconditions === undefined ? current.preconditions : preconditions,
          suiteId === undefined ? current.suite_id : suiteId,
          id,
        )

      if (steps) {
        this.db.prepare('DELETE FROM test_case_steps WHERE test_case_id = ?').run(id)
        this.insertSteps(id, steps)
      }

      this.db.exec('COMMIT')
      return this.getTestCase(id)!
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  deleteTestCase(id: number): void {
    this.db.prepare('DELETE FROM test_cases WHERE id = ?').run(id)
  }

  close(): void {
    this.db.close()
  }

  private insertSteps(testCaseId: number, steps: TestStep[]): void {
    const insertStep = this.db.prepare(
      'INSERT INTO test_case_steps (test_case_id, step_order, action, expected_output) VALUES (?, ?, ?, ?)',
    )
    steps.forEach((step, index) => {
      insertStep.run(testCaseId, index, step.action, step.expectedOutput)
    })
  }

  private hydrateTestCase(row: TestCaseRow): TestCase {
    const stepRows = this.db
      .prepare('SELECT * FROM test_case_steps WHERE test_case_id = ? ORDER BY step_order')
      .all(row.id) as unknown as TestCaseStepRow[]

    return {
      id: row.id,
      name: row.name,
      preconditions: row.preconditions,
      suiteId: row.suite_id,
      steps: stepRows.map(toStep),
    }
  }
}

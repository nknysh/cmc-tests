export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS test_suites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES test_suites(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS idx_test_suites_parent_id ON test_suites(parent_id);

CREATE TABLE IF NOT EXISTS test_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  suite_id INTEGER REFERENCES test_suites(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  preconditions TEXT
) STRICT;

CREATE INDEX IF NOT EXISTS idx_test_cases_suite_id ON test_cases(suite_id);

CREATE TABLE IF NOT EXISTS test_case_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_case_id INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  action TEXT NOT NULL,
  expected_output TEXT NOT NULL
) STRICT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_test_case_steps_case_order
  ON test_case_steps(test_case_id, step_order);
`

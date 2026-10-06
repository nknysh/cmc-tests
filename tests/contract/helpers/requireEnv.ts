import { expect } from '@playwright/test'

/** Asserts env var `name` is set (failing the test with a clear message if not) and returns it. */
export function requireEnv(name: string): string {
  const value = process.env[name]
  expect(value, `${name} must be set`).toBeTruthy()
  return value as string
}

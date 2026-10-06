import { expect } from '@playwright/test'
import { z } from 'zod'

/**
 * Asserts `value` satisfies `schema`, failing with zod's readable issue list
 * (path + expected/received) so a contract break says exactly which field
 * drifted. Returns the parsed value, typed by the schema.
 */
export function expectMatchesSchema<T extends z.ZodType>(value: unknown, schema: T): z.infer<T> {
  const result = schema.safeParse(value)
  expect(result.success, result.error ? z.prettifyError(result.error) : undefined).toBe(true)
  return result.data as z.infer<T>
}

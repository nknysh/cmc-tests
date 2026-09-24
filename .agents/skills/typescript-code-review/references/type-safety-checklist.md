# Type Safety Checklist

Five practices to check in every review.

1. **Strict mode is on.** `strict: true` in tsconfig.json (enables `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, ...). For legacy projects, recommend enabling flags one at a time in focused PRs.
2. **No `any`; use `unknown` and narrow.** `any` disables checking for that value. `unknown` forces narrowing before use. Flag `any` in signatures, catch clauses, and parsed JSON.
3. **Narrow with type guards.** Use `typeof`, `instanceof`, `in`, and custom predicates (`value is Foo`). Discriminated unions should end with an exhaustiveness check (`const _: never = x`).
4. **Assertions are a smell.** `as Foo` and `!` silence the compiler rather than prove anything. Prefer guards, `satisfies`, or fixing the model. Repeated assertions mean the types are wrong.
5. **Handle null/undefined explicitly.** Use `?.` and `??` (not `||`, which swallows `0`/`""`). Consider `noUncheckedIndexedAccess` for array/record lookups.

Sources:
- https://dev.to/_d7eb1c1703182e3ce1782/typescript-best-practices-for-production-code-in-2026-lb0
- https://rishikc.com/articles/typescript-strict-mode-best-practices/
- https://sandroroth.com/blog/typescript-types/

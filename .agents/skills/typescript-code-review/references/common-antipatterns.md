# Common TypeScript Anti-Patterns

Five to flag in review.

1. **Unvalidated external data.** `await res.json() as Foo` trusts the network. Validate at runtime boundaries (Zod, Valibot, or a hand-written guard), and type the raw shape separately from the domain type.
2. **`async` callback in `forEach`.** Promises are fired and not awaited. Use `for...of` with `await`, or `await Promise.all(items.map(...))`.
3. **Type assertions and `any` to "make it compile".** See `type-safety-checklist.md`. Fix the underlying type instead.
4. **Regular `enum` where a union works.** String-literal unions (or `as const` objects) infer better, serialize cleanly, and emit no runtime code.
5. **Swallowed errors.** Empty `catch`, returning `null` on failure, or `catch (e: any)`. Rethrow or handle deliberately; treat `e` as `unknown` and narrow.

Sources:
- https://ducin.dev/typescript-anti-patterns
- https://levelup.gitconnected.com/10-typescript-anti-patterns-slowing-down-your-development-and-how-to-avoid-them-79c5ffd4f1f6
- https://medium.com/@coolercoder/8-typescript-anti-patterns-i-flag-in-every-code-review-222f06da9e74

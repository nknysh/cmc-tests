# Performance Tips

Two kinds: compile-time (type checker) and runtime.

1. **Measure first.** Compile: `tsc --extendedDiagnostics`, `--generateTrace` + `npx @typescript/analyze-trace`. Runtime: profile before optimizing.
2. **Prefer interfaces and simple types.** `interface extends` is cached better than large intersections; avoid huge unions and deeply recursive or conditional types, since each level is another instantiation.
3. **Annotate return types on exported functions.** Turns open-ended inference into cheap assignability checks and speeds declaration emit.
4. **Trim the project.** Use narrow `include`/`exclude`, `skipLibCheck`, `incremental`, and project references for large repos. Avoid barrel files that pull in whole modules.
5. **Runtime hygiene.** Don't `await` in loops when calls are independent (`Promise.all`); import specific functions, not whole libraries; lazy-load large modules; clean up listeners, timers, and subscriptions; in React, memoize deliberately with correct dependency arrays.

Sources:
- https://github.com/microsoft/TypeScript-wiki/blob/main/Performance.md
- https://www.geldata.com/blog/an-approach-to-optimizing-typescript-type-checking-performance
- https://dev.to/_d7eb1c1703182e3ce1782/typescript-performance-optimization-2026-compile-speed-runtime-efficiency-and-type-safety-48ch

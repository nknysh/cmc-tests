# Self-heal commit auditor

`auditChange.mts` is a shared audit gate, not a standalone script — both
self-heal automations import and call it before they commit:

- `.agents/coinmarketcap-navigation/self-heal-navigation-locators.mts` calls it
  after its patch has already passed e2e re-verification, to catch a patch
  that happens to make tests pass while also changing something beyond the
  broken locator (an assertion, a method signature, an overly broad/fragile
  selector).
- `.agents/btc-price-window/self-heal-btc-price-window.ts` calls it before
  writing the recentred `[min, max]` window, since that script has no
  test-based verification step at all — the audit is the only check between
  a bad price fetch and a silently widened window.

Both self-heal scripts commit with `--no-verify` (see root `CLAUDE.md`), so
the pre-commit `typescript-code-review` hook never sees these changes. That
hook also depends on the `claude` CLI / paid Anthropic API, which the
self-heal scripts are built to avoid entirely — so this auditor runs on the
same **local, offline model** the navigation heal already uses
(Qwen2.5-Coder-7B-Instruct, GGUF, via `node-llama-cpp`, loaded through the
shared `.agents/shared/localModel.mts` helper). No API key, no network call
to an LLM provider, and no second model download — it reuses the navigation
heal's existing model cache directory
(`.agents/coinmarketcap-navigation/models/`, gitignored, cached by
`actions/cache` under the key `qwen2.5-coder-7b-instruct-q4_k_m-gguf` in both
heal workflows).

The model is asked for a strict first line (`VERDICT: PASS` or
`VERDICT: CRITICAL`) plus a short reasoning paragraph. **It fails closed**:
if the response doesn't parse as a clean verdict, that's treated as
`CRITICAL` — an unreviewed automated commit is worse than a false-positive
block a human can clear. On `CRITICAL`, the calling script reverts/discards
the proposed change and skips the commit entirely (the navigation script
also sets a non-zero exit code, matching its existing "leave for a human"
paths; the price-window script just leaves the existing window in place, so
a genuine drift will surface as an ordinary test failure instead of being
silently accepted).

`auditChange` only returns a verdict — it never writes, reverts, or commits
anything itself; that stays the caller's responsibility.

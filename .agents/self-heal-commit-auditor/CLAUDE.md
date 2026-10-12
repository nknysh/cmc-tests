# Self-heal commit auditor

`auditChange.mts` is an audit gate, not a standalone script.
`.agents/coinmarketcap-navigation/self-heal-navigation-locators.mts` calls it
after its patch has already passed e2e re-verification, to catch a patch
that happens to make tests pass while also changing something beyond the
broken locator (an assertion, a method signature, an overly broad/fragile
selector).

The BTC price window heal used to call it too, but its checks are all
arithmetic (positive price, unchanged width, min < max, size of the shift),
and the local model got those comparisons wrong: on 2026-10-12 it blocked
valid recentrings as "inverted" or "non-positive". That script now checks
the recentring in code (`recentringProblems` in
`.agents/btc-price-window/self-heal-btc-price-window.ts`). Keep this auditor
for judgments code can't make, not for numeric checks.

The navigation heal commits with `--no-verify` (see root `CLAUDE.md`), so
the pre-commit `typescript-code-review` hook never sees its changes. That
hook also depends on the `claude` CLI / paid Anthropic API, which the
self-heal scripts are built to avoid entirely — so this auditor runs on the
same **local, offline model** the navigation heal already uses
(Qwen2.5-Coder-7B-Instruct, GGUF, via `node-llama-cpp`, loaded through the
shared `.agents/shared/localModel.mts` helper). No API key, no network call
to an LLM provider, and no second model download — it reuses the navigation
heal's existing model cache directory
(`.agents/coinmarketcap-navigation/models/`, gitignored, cached by
`actions/cache` under the key `qwen2.5-coder-7b-instruct-q4_k_m-gguf` in the
navigation heal workflow).

The model is asked for a strict first line (`VERDICT: PASS` or
`VERDICT: CRITICAL`) plus a short reasoning paragraph. **It fails closed**:
if the response doesn't parse as a clean verdict, that's treated as
`CRITICAL` — an unreviewed automated commit is worse than a false-positive
block a human can clear. On `CRITICAL`, the navigation script reverts the
proposed patch, skips the commit and sets a non-zero exit code, matching its
existing "leave for a human" paths.

`auditChange` only returns a verdict — it never writes, reverts, or commits
anything itself; that stays the caller's responsibility.

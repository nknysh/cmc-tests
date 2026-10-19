# Self-heal commit auditor

`auditChange.mts` is an audit gate, not a standalone script.
`.agents/coinboard-locators/self-heal-coinboard-locators.mts` calls it once
per patched page object, after the patch has already passed re-verification
against the CoinBoard UI suite, to catch a patch that happens to make tests
pass while also changing something beyond the broken locator (an assertion,
a method signature, an overly broad/fragile locator).

The BTC price window heal used to call it too, but its checks are all
arithmetic (positive price, unchanged width, min < max, size of the shift),
and the local model got those comparisons wrong: on 2026-10-12 it blocked
valid recentrings as "inverted" or "non-positive". That script now checks
the recentring in code (`recentringProblems` in
`.agents/btc-price-window/self-heal-btc-price-window.ts`). Keep this auditor
for judgments code can't make, not for numeric checks.

The CoinBoard locator heal commits with `--no-verify` (see root `CLAUDE.md`), so
the pre-commit `typescript-code-review` hook never sees its changes. That
hook also depends on the `claude` CLI / paid Anthropic API, which the
self-heal scripts are built to avoid entirely — so this auditor runs on the
same **local, offline model** the CoinBoard locator heal uses
(Qwen2.5-Coder-7B-Instruct, GGUF, via `node-llama-cpp`, loaded through the
shared `.agents/shared/localModel.mts` helper). No API key, no network call
to an LLM provider, and no second model download — both share the gitignored
`.agents/shared/models/` directory. CI doesn't cache it: the model only
downloads on a run that actually heals.

The model is asked for a strict first line (`VERDICT: PASS` or
`VERDICT: CRITICAL`) plus a short reasoning paragraph. **It fails closed**:
if the response doesn't parse as a clean verdict, that's treated as
`CRITICAL` — an unreviewed automated commit is worse than a false-positive
block a human can clear. On `CRITICAL`, the CoinBoard script reverts every
proposed patch, skips the commit and sets a non-zero exit code, matching its
existing "leave for a human" paths.

`auditChange` only returns a verdict — it never writes, reverts, or commits
anything itself; that stays the caller's responsibility.

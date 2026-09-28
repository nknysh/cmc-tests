import fs from 'node:fs'
import { promptLocalModel } from '../shared/localModel.mts'

const VERDICT_LINE = /^VERDICT:\s*(PASS|CRITICAL)\b/i

// Local models are less reliable than Claude about honoring a strict output
// format - constrain it to a single parseable first line, same tactic as the
// navigation heal's stripCodeFence for its own local-model output.
const FORMAT_INSTRUCTION =
  'Reply with a first line that is EXACTLY "VERDICT: PASS" or "VERDICT: CRITICAL", ' +
  'followed by a short paragraph explaining why. No markdown, no other text before the verdict line.'

export async function auditChange(params: {
  systemPrompt: string
  userPrompt: string
  contextSize?: number
}): Promise<{ critical: boolean; reasoning: string }> {
  const response = await promptLocalModel({
    systemPrompt: `${params.systemPrompt} ${FORMAT_INSTRUCTION}`,
    userPrompt: params.userPrompt,
    contextSize: params.contextSize,
  })

  const match = response.trim().match(VERDICT_LINE)
  const result = !match
    ? {
        // An automated commit nobody reviewed is worse than a false-positive
        // block a human can clear - fail closed on an unparseable response.
        critical: true,
        reasoning: `unparseable auditor response, blocking out of caution. Raw response: ${response.slice(0, 500)}`,
      }
    : {
        critical: match[1].toUpperCase() === 'CRITICAL',
        reasoning: response.trim().slice(match[0].length).trim(),
      }

  // Logged unconditionally, not just on a block - a PASS verdict's reasoning
  // is what tells a human later whether the auditor actually scrutinised a
  // change or waved it through for a weak reason, which a block-only log
  // can't show.
  console.log(`[self-heal-commit-auditor] verdict: ${result.critical ? 'CRITICAL' : 'PASS'}\n${result.reasoning}`)

  return result
}

// Called by a caller's CRITICAL branch. A plain console.error can scroll off
// in a long CI log (especially in the price-window heal, which doesn't fail
// the job on a block), so this also writes to the GitHub Actions job summary
// when running in CI, where a blocked commit is otherwise easy to miss since
// the workflow can still finish green.
export function reportAuditBlock(context: string, reasoning: string): void {
  console.error(
    ['', `🚫 [self-heal-commit-auditor] BLOCKED — ${context}`, reasoning, ''].join('\n')
  )

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### 🚫 Self-heal commit blocked — ${context}\n\n${reasoning}\n\n`
    )
  }
}

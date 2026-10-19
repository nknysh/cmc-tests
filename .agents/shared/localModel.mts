import path from 'node:path'
// Dynamic import, not a static one: node-llama-cpp's entry point does a
// top-level await, and this module is loaded from self-heal-btc-price-window.ts
// via Playwright's globalSetup, which (per this repo's commonjs tsconfig) loads
// TS files through require() - Node refuses to require() an ESM graph that
// contains a top-level await ("require() cannot be used on an ESM graph with
// top-level await"). A dynamic import() always goes through Node's ESM loader
// regardless of the caller's own module system, so it works from both that
// require()-based path and the CoinBoard locator heal's direct `node script.mts` (ESM).
async function loadNodeLlamaCpp(): Promise<typeof import('node-llama-cpp')> {
  return import('node-llama-cpp')
}

// Runs fully offline via node-llama-cpp; downloaded once (~4.7GB) on first use
// into a gitignored dir shared by every caller, so they never download it twice.
export const MODEL_URI = 'hf:Qwen/Qwen2.5-Coder-7B-Instruct-GGUF:Q4_K_M'
export const MODELS_DIR = path.join(process.cwd(), '.agents/shared/models')

// Loads, prompts once, and disposes - a caller needing two prompts in one run
// (e.g. propose-a-fix then audit-the-fix) pays for two full loads rather than
// keeping the ~4.7GB model resident between them. That's intentional when a
// heavyweight step (a headless-browser Playwright run) sits between the two
// prompts: keeping the model loaded across it would stack its memory
// footprint on top of Chromium's during the phase most likely to be
// memory-constrained on a standard CI runner.
// Disposal is nested per resource (rather than three sequential awaits in one
// finally) so that: (1) a failure partway through acquisition only disposes
// what was actually acquired, and (2) one dispose throwing doesn't skip the
// others or mask whatever error the finally block is already unwinding for.
async function disposeQuietly(name: string, dispose: () => Promise<void>): Promise<void> {
  try {
    await dispose()
  } catch (error) {
    console.warn(`[localModel] failed to dispose ${name}`, error)
  }
}

// Without these bounds a prompt can run for as long as the model keeps
// generating: CPU inference is minutes per completion, and a 7B model can
// ramble well past the answer. A run past the timeout throws rather than
// returning a cut-off answer, which a caller could mistake for a whole file.
const DEFAULT_MAX_TOKENS = 4096
const DEFAULT_TIMEOUT_MS = 30 * 60_000

const elapsed = (start: number) => `${Math.round((Date.now() - start) / 1000)}s`

export async function promptLocalModel(params: {
  systemPrompt: string
  userPrompt: string
  contextSize?: number
  maxTokens?: number
  timeoutMs?: number
}): Promise<string> {
  const { getLlama, resolveModelFile, LlamaChatSession } = await loadNodeLlamaCpp()
  const start = Date.now()
  // Logged first: the first call downloads ~4.7GB, which otherwise looks like a hang.
  console.log(`[localModel] resolving ${MODEL_URI} in ${MODELS_DIR} (downloads ~4.7GB on first use)`)
  const modelPath = await resolveModelFile(MODEL_URI, { directory: MODELS_DIR, cli: true })

  const llama = await getLlama()
  try {
    const model = await llama.loadModel({ modelPath })
    try {
      const context = await model.createContext({ contextSize: params.contextSize ?? 8192 })
      try {
        const session = new LlamaChatSession({
          contextSequence: context.getSequence(),
          systemPrompt: params.systemPrompt,
        })

        const maxTokens = params.maxTokens ?? DEFAULT_MAX_TOKENS
        const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS
        console.log(
          `[localModel] model ready after ${elapsed(start)}, generating (max ${maxTokens} tokens, timeout ${timeoutMs / 60_000} min)`
        )
        const response = await session.prompt(params.userPrompt, {
          maxTokens,
          signal: AbortSignal.timeout(timeoutMs),
        })
        console.log(`[localModel] done after ${elapsed(start)}`)
        return response
      } finally {
        await disposeQuietly('context', () => context.dispose())
      }
    } finally {
      await disposeQuietly('model', () => model.dispose())
    }
  } finally {
    await disposeQuietly('llama', () => llama.dispose())
  }
}

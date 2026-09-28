import path from 'node:path'
// Dynamic import, not a static one: node-llama-cpp's entry point does a
// top-level await, and this module is loaded from self-heal-btc-price-window.ts
// via Playwright's globalSetup, which (per this repo's commonjs tsconfig) loads
// TS files through require() - Node refuses to require() an ESM graph that
// contains a top-level await ("require() cannot be used on an ESM graph with
// top-level await"). A dynamic import() always goes through Node's ESM loader
// regardless of the caller's own module system, so it works from both that
// require()-based path and the navigation heal's direct `node script.mts` (ESM).
async function loadNodeLlamaCpp() {
  return import('node-llama-cpp')
}

// Runs fully offline via node-llama-cpp; downloaded once (~4.7GB) on first use.
// Deliberately kept pointed at the navigation heal's existing models dir (already
// gitignored, already the CI cache key) rather than a new "shared" location, so
// no extra ~4.7GB download or cache-key change is needed for callers that reuse it.
export const MODEL_URI = 'hf:Qwen/Qwen2.5-Coder-7B-Instruct-GGUF:Q4_K_M'
export const MODELS_DIR = path.join(process.cwd(), '.agents/coinmarketcap-navigation/models')

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

export async function promptLocalModel(params: {
  systemPrompt: string
  userPrompt: string
  contextSize?: number
}): Promise<string> {
  const { getLlama, resolveModelFile, LlamaChatSession } = await loadNodeLlamaCpp()
  const modelPath = await resolveModelFile(MODEL_URI, MODELS_DIR)

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

        return await session.prompt(params.userPrompt)
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

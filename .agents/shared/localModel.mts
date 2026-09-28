import path from 'node:path'
import { getLlama, resolveModelFile, LlamaChatSession } from 'node-llama-cpp'

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
export async function promptLocalModel(params: {
  systemPrompt: string
  userPrompt: string
  contextSize?: number
}): Promise<string> {
  const modelPath = await resolveModelFile(MODEL_URI, MODELS_DIR)

  const llama = await getLlama()
  const model = await llama.loadModel({ modelPath })
  const context = await model.createContext({ contextSize: params.contextSize ?? 8192 })

  try {
    const session = new LlamaChatSession({
      contextSequence: context.getSequence(),
      systemPrompt: params.systemPrompt,
    })

    return await session.prompt(params.userPrompt)
  } finally {
    await context.dispose()
    await model.dispose()
    await llama.dispose()
  }
}

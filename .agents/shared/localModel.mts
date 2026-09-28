import path from 'node:path'
import { getLlama, resolveModelFile, LlamaChatSession } from 'node-llama-cpp'

// Runs fully offline via node-llama-cpp; downloaded once (~4.7GB) on first use.
// Deliberately kept pointed at the navigation heal's existing models dir (already
// gitignored, already the CI cache key) rather than a new "shared" location, so
// no extra ~4.7GB download or cache-key change is needed for callers that reuse it.
export const MODEL_URI = 'hf:Qwen/Qwen2.5-Coder-7B-Instruct-GGUF:Q4_K_M'
export const MODELS_DIR = path.join(process.cwd(), '.agents/coinmarketcap-navigation/models')

export interface LocalModel {
  prompt(params: { systemPrompt: string; userPrompt: string; contextSize?: number }): Promise<string>
  dispose(): Promise<void>
}

// Loading the model weights (~4.7GB, minutes on CPU) is the expensive part -
// a caller making multiple prompts in one run (e.g. propose-a-fix then
// audit-the-fix) should load once via this and reuse it, rather than paying
// that cost per prompt. A fresh context/sequence is still created per prompt
// call, which is comparatively cheap, so prompts don't share conversation
// history with each other.
export async function loadLocalModel(): Promise<LocalModel> {
  const modelPath = await resolveModelFile(MODEL_URI, MODELS_DIR)
  const llama = await getLlama()
  const model = await llama.loadModel({ modelPath })

  return {
    async prompt({ systemPrompt, userPrompt, contextSize = 8192 }) {
      const context = await model.createContext({ contextSize })
      try {
        const session = new LlamaChatSession({ contextSequence: context.getSequence(), systemPrompt })
        return await session.prompt(userPrompt)
      } finally {
        await context.dispose()
      }
    },
    async dispose() {
      await model.dispose()
      await llama.dispose()
    },
  }
}

export async function promptLocalModel(params: {
  systemPrompt: string
  userPrompt: string
  contextSize?: number
}): Promise<string> {
  const model = await loadLocalModel()
  try {
    return await model.prompt(params)
  } finally {
    await model.dispose()
  }
}

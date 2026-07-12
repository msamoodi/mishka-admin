import OpenAI from "openai"

// Lazy singleton — instantiated on first use, not at module load time,
// so the build doesn't fail if the env var isn't set at build phase.
let _client: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set")
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _client
}

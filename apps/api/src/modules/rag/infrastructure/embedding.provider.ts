import type { ApiConfig } from '../../../platform/config/api-config';
import type { EmbeddingProviderPort } from '../application/rag.ports';

/** Optional embedding client supporting OpenAI/OpenRouter-compatible embeddings, with clean FTS fallback when unconfigured. */
export class EnvEmbeddingProvider implements EmbeddingProviderPort {
  private readonly apiKey: string | null;
  private readonly endpoint: string;
  private readonly model: string;

  constructor(config?: Partial<ApiConfig>) {
    const openAiKey = config?.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY ?? '';
    const openRouterKey = config?.OPENROUTER_API_KEY ?? process.env.OPENROUTER_API_KEY ?? '';
    if (openAiKey) {
      this.apiKey = openAiKey;
      this.endpoint = 'https://api.openai.com/v1/embeddings';
      this.model = process.env.API_EMBEDDING_MODEL ?? 'text-embedding-3-small';
    } else if (openRouterKey) {
      this.apiKey = openRouterKey;
      this.endpoint = 'https://openrouter.ai/api/v1/embeddings';
      this.model = process.env.API_EMBEDDING_MODEL ?? 'openai/text-embedding-3-small';
    } else {
      this.apiKey = null;
      this.endpoint = '';
      this.model = '';
    }
  }

  async embed(texts: readonly string[]): Promise<Array<number[] | null>> {
    if (!this.apiKey || texts.length === 0) {
      return texts.map(() => null);
    }
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ model: this.model, input: texts, dimensions: 1536 }),
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) return texts.map(() => null);
      const payload = (await response.json()) as { data?: Array<{ embedding?: number[] }> };
      return texts.map((_, index) => {
        const vector = payload.data?.[index]?.embedding;
        return Array.isArray(vector) && vector.length === 1536 ? vector : null;
      });
    } catch {
      return texts.map(() => null);
    }
  }
}

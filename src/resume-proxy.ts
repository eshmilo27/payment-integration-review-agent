import { ModelClient } from './types.js';

export class ResumeAgentProxy implements ModelClient {
  constructor(
    private readonly endpoint: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = 20_000,
    private readonly origin = 'https://shmilo-in-cloud.com'
  ) {}

  async complete(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<string> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(this.endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: this.origin },
          body: JSON.stringify({ operation: 'agent-completion', systemPrompt, userPrompt, maxTokens }),
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`resume agent proxy failed with status ${response.status}`);
        const data = await response.json() as { content?: string };
        if (!data.content?.trim()) throw new Error('resume agent proxy returned an empty response');
        return data.content.trim();
      } catch (error) {
        lastError = error;
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError;
  }
}

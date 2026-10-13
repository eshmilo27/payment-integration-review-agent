import { ModelClient } from './types.js';

export interface GroqOptions {
  apiKey: string;
  model: string;
  apiUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class GroqClient implements ModelClient {
  private readonly options: {
    apiKey: string;
    model: string;
    apiUrl: string;
    timeoutMs: number;
    fetchImpl: typeof fetch;
  };

  constructor(options: GroqOptions) {
    this.options = {
      ...options,
      timeoutMs: options.timeoutMs ?? 20_000,
      fetchImpl: options.fetchImpl ?? fetch
    };
  }

  async complete(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<string> {
    if (!this.options.apiKey) throw new Error('GROQ_API_KEY is not configured');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await this.options.fetchImpl(this.options.apiUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.options.apiKey}` },
        body: JSON.stringify({
          model: this.options.model,
          temperature: 0.2,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`model request failed with status ${response.status}`);
      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error('model returned an empty response');
      return content;
    } finally {
      clearTimeout(timer);
    }
  }
}

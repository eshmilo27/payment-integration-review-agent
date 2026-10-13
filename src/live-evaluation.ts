import { readFile } from 'node:fs/promises';
import { GroqClient } from './groq.js';
import { runReview } from './orchestrator.js';

const fixtures = JSON.parse(await readFile(new URL('../fixtures/scenarios.json', import.meta.url), 'utf8')) as Array<{ name: string; scenario: string }>;
const model = process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b';
const client = new GroqClient({
  apiKey: process.env.GROQ_API_KEY ?? '',
  model,
  apiUrl: process.env.GROQ_API_URL ?? 'https://api.groq.com/openai/v1/chat/completions'
});

// One full review makes six model calls. Keep the optional live check within
// the Groq free-tier token-per-minute budget; deterministic tests cover all fixtures.
for (const fixture of fixtures.slice(0, 1)) {
  const result = await runReview(fixture, client, model);
  if (result.stages.length !== 5 || result.review.humanReview.length < 2) {
    throw new Error(`live evaluation failed for fixture ${fixture.name}`);
  }
  console.log(`passed: ${fixture.name} (${result.stages.length} specialist stages + synthesis)`);
}

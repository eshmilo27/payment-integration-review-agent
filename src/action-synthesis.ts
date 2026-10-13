import { readFile, writeFile } from 'node:fs/promises';
import { GroqClient } from './groq.js';
import { SYNTHESIS_PROMPT } from './prompts.js';
import { StageName, StageResult } from './types.js';
import { assertStageOrder, validateFinalReview, validateScenario, validateStageResult } from './validation.js';

const { scenario } = validateScenario({ scenario: process.env.AGENT_SCENARIO ?? '' });
const resultsDirectory = process.env.AGENT_RESULTS_DIR ?? 'results';
const specialistStages = ['planner', 'payment-domain', 'security-compliance', 'reliability', 'test-design'] as const;
const results: StageResult[] = [];

for (const stage of specialistStages) {
  const content = await readFile(`${resultsDirectory}/${stage}.json`, 'utf8');
  results.push(validateStageResult(stage, JSON.parse(content)));
}
assertStageOrder(results);

const model = process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b';
const client = new GroqClient({
  apiKey: process.env.GROQ_API_KEY ?? '',
  model,
  apiUrl: process.env.GROQ_API_URL ?? 'https://api.groq.com/openai/v1/chat/completions'
});
const content = await client.complete(
  SYNTHESIS_PROMPT,
  `Synthesize this review context:\n${JSON.stringify({ scenario, specialistFindings: results })}`,
  650
);
const review = validateFinalReview(JSON.parse(content));
await writeFile(`${resultsDirectory}/final-review.json`, JSON.stringify({ stages: results, review, model }, null, 2) + '\n');
console.log(`completed synthesis (${results.length} specialist stages)`);

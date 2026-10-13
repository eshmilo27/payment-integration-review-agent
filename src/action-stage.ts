import { mkdir, writeFile } from 'node:fs/promises';
import { GroqClient } from './groq.js';
import { STAGE_PROMPTS } from './prompts.js';
import { StageName } from './types.js';
import { validateScenario, validateStageResult } from './validation.js';

const stage = process.env.AGENT_STAGE as Exclude<StageName, 'synthesis'> | undefined;
if (!stage || !(stage in STAGE_PROMPTS)) {
  throw new Error('AGENT_STAGE must identify a specialist stage');
}

const { scenario } = validateScenario({ scenario: process.env.AGENT_SCENARIO ?? '' });
const model = process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b';
const client = new GroqClient({
  apiKey: process.env.GROQ_API_KEY ?? '',
  model,
  apiUrl: process.env.GROQ_API_URL ?? 'https://api.groq.com/openai/v1/chat/completions'
});

const content = await client.complete(
  STAGE_PROMPTS[stage],
  `Review this fictional integration scenario:\n${scenario}`,
  450
);
const result = validateStageResult(stage, JSON.parse(content));
const outputDirectory = process.env.AGENT_OUTPUT_DIR ?? 'results';
await mkdir(outputDirectory, { recursive: true });
await writeFile(`${outputDirectory}/${stage}.json`, JSON.stringify(result, null, 2) + '\n');
console.log(`completed ${stage}`);

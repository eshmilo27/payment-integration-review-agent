import { ModelClient, ReviewResponse, StageName, StageResult, STAGES } from './types.js';
import { STAGE_PROMPTS, SYNTHESIS_PROMPT } from './prompts.js';
import { assertStageOrder, validateFinalReview, validateScenario, validateStageResult } from './validation.js';

const reviewStages = STAGES.slice(0, -1) as Exclude<StageName, 'synthesis'>[];

async function completeJson<T>(
  client: ModelClient,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  validate: (value: unknown) => T
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const suffix = attempt === 0
        ? ''
        : '\nYour previous response failed validation. Return only valid JSON with every required array containing the requested minimum number of concise strings.';
      const raw = await client.complete(systemPrompt, userPrompt + suffix, maxTokens);
      return validate(JSON.parse(raw));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function runReview(input: unknown, client: ModelClient, model: string, onStage?: (stage: StageName) => void): Promise<ReviewResponse> {
  const { scenario } = validateScenario(input);
  const results: StageResult[] = [];
  for (const stage of reviewStages) {
    onStage?.(stage);
    results.push(await completeJson(
      client,
      STAGE_PROMPTS[stage],
      `Review this fictional integration scenario:\n${scenario}`,
      450,
      (value) => validateStageResult(stage, value)
    ));
  }
  assertStageOrder(results);
  onStage?.('synthesis');
  const synthesisInput = JSON.stringify({ scenario, specialistFindings: results });
  const review = await completeJson(
    client,
    SYNTHESIS_PROMPT,
    `Synthesize this review context:\n${synthesisInput}`,
    650,
    validateFinalReview
  );
  return { stages: results, review, model };
}

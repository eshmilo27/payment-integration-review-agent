import { ModelClient, ReviewResponse, StageName, StageResult, STAGES } from './types.js';
import { STAGE_PROMPTS, SYNTHESIS_PROMPT } from './prompts.js';
import { assertStageOrder, validateFinalReview, validateScenario, validateStageResult } from './validation.js';

const reviewStages = STAGES.slice(0, -1) as Exclude<StageName, 'synthesis'>[];

export async function runReview(input: unknown, client: ModelClient, model: string, onStage?: (stage: StageName) => void): Promise<ReviewResponse> {
  const { scenario } = validateScenario(input);
  const results: StageResult[] = [];
  for (const stage of reviewStages) {
    onStage?.(stage);
    const raw = await client.complete(STAGE_PROMPTS[stage], `Review this fictional integration scenario:\n${scenario}`, 450);
    const parsed = validateStageResult(stage, JSON.parse(raw));
    results.push(parsed);
  }
  assertStageOrder(results);
  onStage?.('synthesis');
  const synthesisInput = JSON.stringify({ scenario, specialistFindings: results });
  const finalRaw = await client.complete(SYNTHESIS_PROMPT, `Synthesize this review context:\n${synthesisInput}`, 650);
  return { stages: results, review: validateFinalReview(JSON.parse(finalRaw)), model };
}

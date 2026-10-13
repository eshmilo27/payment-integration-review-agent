import { FinalReview, ReviewScenario, StageName, StageResult, STAGES } from './types.js';

const MAX_SCENARIO_LENGTH = 1200;
const MAX_ITEM_LENGTH = 500;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateScenario(input: unknown): ReviewScenario {
  if (!input || typeof input !== 'object' || typeof (input as { scenario?: unknown }).scenario !== 'string') {
    throw new ValidationError('scenario must be a string');
  }
  const scenario = (input as { scenario: string }).scenario.trim();
  if (!scenario) throw new ValidationError('scenario must not be empty');
  if (scenario.length > MAX_SCENARIO_LENGTH) throw new ValidationError(`scenario must be ${MAX_SCENARIO_LENGTH} characters or fewer`);
  if (/\b(?:card number|cvv|cvc|password|secret|api key)\s*[:=]/i.test(scenario)) {
    throw new ValidationError('Do not submit cardholder data, credentials, or secrets');
  }
  return { scenario };
}

function strings(value: unknown, field: string, min: number, max: number): string[] {
  if (!Array.isArray(value) || value.length < min || value.length > max || !value.every((item) => typeof item === 'string')) {
    throw new ValidationError(`${field} must contain ${min}-${max} strings`);
  }
  return value.map((item) => item.trim()).filter(Boolean).map((item) => item.slice(0, MAX_ITEM_LENGTH));
}

export function validateStageResult(stage: StageName, value: unknown): StageResult {
  if (!value || typeof value !== 'object') throw new ValidationError(`${stage} output must be an object`);
  return { stage, findings: strings((value as { findings?: unknown }).findings, 'findings', 2, 4) };
}

export function validateFinalReview(value: unknown): FinalReview {
  if (!value || typeof value !== 'object') throw new ValidationError('synthesis output must be an object');
  const review = value as Partial<FinalReview>;
  if (typeof review.summary !== 'string' || !review.summary.trim()) throw new ValidationError('summary must be a non-empty string');
  return {
    summary: review.summary.trim().slice(0, MAX_ITEM_LENGTH),
    strengths: strings(review.strengths, 'strengths', 2, 4),
    risks: strings(review.risks, 'risks', 2, 6),
    testCases: strings(review.testCases, 'testCases', 2, 6),
    humanReview: strings(review.humanReview, 'humanReview', 2, 5)
  };
}

export function assertStageOrder(stages: StageResult[]): void {
  const expected = STAGES.slice(0, -1);
  if (stages.length !== expected.length || stages.some((result, index) => result.stage !== expected[index])) {
    throw new ValidationError('review stages are incomplete or out of order');
  }
}

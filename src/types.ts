export const STAGES = [
  'planner',
  'payment-domain',
  'security-compliance',
  'reliability',
  'test-design',
  'synthesis'
] as const;

export type StageName = (typeof STAGES)[number];

export interface ReviewScenario {
  scenario: string;
}

export interface StageResult {
  stage: StageName;
  findings: string[];
}

export interface FinalReview {
  summary: string;
  strengths: string[];
  risks: string[];
  testCases: string[];
  humanReview: string[];
}

export interface ReviewResponse {
  stages: StageResult[];
  review: FinalReview;
  model: string;
}

export interface ModelClient {
  complete(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<string>;
}

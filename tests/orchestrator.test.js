import test from 'node:test';
import assert from 'node:assert/strict';
import { runReview } from '../dist/orchestrator.js';
import { validateScenario } from '../dist/validation.js';

const findings = (name) => JSON.stringify({ findings: [`${name} finding one`, `${name} finding two`] });
const finalReview = JSON.stringify({
  summary: 'The design has a reasonable starting boundary but needs validation.',
  strengths: ['Encrypted transport is proposed.', 'The gateway boundary is explicit.'],
  risks: ['Retry behavior needs idempotency.', 'Logs may expand the compliance boundary.'],
  testCases: ['Exercise authorization timeout and retry.', 'Exercise duplicate request recovery.'],
  humanReview: ['Confirm tokenization and data-flow boundaries.', 'Approve the recovery strategy before implementation.']
});

test('orchestrates all specialist stages and synthesis in order', async () => {
  const calls = [];
  const client = {
    complete: async (_system, user) => {
      calls.push(user);
      return calls.length === 6 ? finalReview : findings(calls.length);
    }
  };
  const result = await runReview({ scenario: 'Fictional contactless POS integration.' }, client, 'test-model');
  assert.equal(result.stages.length, 5);
  assert.equal(result.review.testCases.length, 2);
  assert.equal(calls.length, 6);
  assert.match(calls.at(-1), /specialistFindings/);
});

test('rejects credentials and cardholder-data-like input', () => {
  assert.throws(() => validateScenario({ scenario: 'Use card number: 4111111111111111' }), /cardholder data/);
  assert.throws(() => validateScenario({ scenario: 'Use an api key: abc' }), /secrets/);
});

test('rejects overlong scenarios', () => {
  assert.throws(() => validateScenario({ scenario: 'x'.repeat(1201) }), /1200/);
});

test('rejects malformed stage output', async () => {
  const client = { complete: async () => JSON.stringify({ findings: ['only one'] }) };
  await assert.rejects(() => runReview({ scenario: 'synthetic scenario' }, client, 'test-model'), /2-4/);
});

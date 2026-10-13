import test from 'node:test';
import assert from 'node:assert/strict';
import { GroqClient } from '../dist/groq.js';

test('retries a temporary rate limit using the provider retry hint', async () => {
  let calls = 0;
  const client = new GroqClient({
    apiKey: 'test-key',
    model: 'test-model',
    apiUrl: 'https://example.test/chat',
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return new Response('', { status: 429, headers: { 'retry-after': '0.001' } });
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"findings":["one","two"]}' } }]
      }), { status: 200 });
    }
  });

  const content = await client.complete('system', 'user', 100);
  assert.equal(content, '{"findings":["one","two"]}');
  assert.equal(calls, 2);
});

test('retries provider JSON-generation failures with a compact-output instruction', async () => {
  let calls = 0;
  const client = new GroqClient({
    apiKey: 'test-key',
    model: 'test-model',
    apiUrl: 'https://example.test/chat',
    fetchImpl: async (_url, options) => {
      calls += 1;
      const request = JSON.parse(options.body);
      if (calls === 1) {
        return new Response(JSON.stringify({ error: { message: 'Failed to generate JSON.' } }), { status: 400 });
      }
      assert.match(request.messages[1].content, /compact valid JSON/);
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"findings":["one","two"]}' } }]
      }), { status: 200 });
    }
  });

  const content = await client.complete('system', 'user', 100);
  assert.equal(content, '{"findings":["one","two"]}');
  assert.equal(calls, 2);
});

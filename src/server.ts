import { readFile } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GroqClient } from './groq.js';
import { runReview } from './orchestrator.js';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'public');
const port = Number(process.env.PORT ?? 8080);
const client = new GroqClient({
  apiKey: process.env.GROQ_API_KEY ?? '',
  model: process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b',
  apiUrl: process.env.GROQ_API_URL ?? 'https://api.groq.com/openai/v1/chat/completions'
});

const contentTypes: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

createServer(async (request, response) => {
  response.setHeader('access-control-allow-origin', '*');
  response.setHeader('access-control-allow-headers', 'content-type');
  if (request.method === 'OPTIONS') {
    response.writeHead(204).end();
    return;
  }
  if (request.method === 'POST' && request.url === '/api/review') {
    let body = '';
    for await (const chunk of request) body += chunk;
    try {
      const result = await runReview(JSON.parse(body), client, process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b');
      response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'review failed';
      const status = /scenario|output|stages|secret|credential|cardholder/i.test(message) ? 400 : 502;
      response.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify({ error: message }));
    }
    return;
  }
  const pathname = request.url === '/' ? '/index.html' : request.url ?? '/index.html';
  const file = join(root, pathname.replace(/^\/+/, ''));
  readFile(file, (error, data) => {
    if (error) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, { 'content-type': contentTypes[extname(file)] ?? 'application/octet-stream' }).end(data);
  });
}).listen(port, () => console.log(`Payment review agent listening on http://localhost:${port}`));

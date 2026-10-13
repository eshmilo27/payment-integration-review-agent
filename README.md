# Payment Integration Review Agent

This portfolio project demonstrates a production-minded, multi-stage agentic AI workflow for reviewing **fictional** retail payment integrations. It is designed to show evidence for the GitHub Certified Agentic AI Developer skill areas: integration, orchestration, structured outputs, safety, human approval, evaluation, and GitHub Actions-based delivery.

## Architecture

```text
Browser
  -> TypeScript HTTP service
     -> planner
     -> payment-domain reviewer
     -> security/compliance reviewer
     -> reliability reviewer
     -> test-design reviewer
     -> synthesis + human-review gate
        -> validated JSON response
```

Each stage is a separate model call with a specialist prompt. The orchestrator validates every handoff before passing it to synthesis. The model adapter is Groq-compatible and configurable through environment variables.

## Run locally

Requirements: Node.js 20+ and a Groq API key.

```bash
cp .env.example .env
# Set GROQ_API_KEY in .env or export it in your shell.
npm install
npm run build
GROQ_API_KEY=your-key npm start
```

Open `http://localhost:8080`. Never enter real cardholder data, credentials, secrets, or production payloads.

## Evaluation and CI

`npm test` runs without a model key and covers:

- six-stage orchestration order
- strict output shape validation
- sensitive-data and secret rejection
- input limits
- malformed model output handling

GitHub Actions runs build, tests, and the same deterministic checks on every push and pull request. Optional live evaluations can be enabled with the repository variable `ENABLE_LIVE_EVALUATION=true` and the `GROQ_API_KEY` secret. Live model evaluations should be treated as advisory because model output can vary.

## Certificate-skill evidence

- **Integrating agents:** a browser application calls a server-side model adapter.
- **Orchestrating agents:** specialist stages execute independently and pass validated context to synthesis.
- **Reliability:** bounded input, timeouts, explicit errors, strict schemas, and deterministic regression tests.
- **Safety and governance:** synthetic-data-only policy, prompt boundaries, secret protection, human approval gate, and no unsupported compliance claims.
- **GitHub as control plane:** versioned prompts and code, pull-request CI, automated evaluation, and optional secret-gated live checks.

This project does not claim to replace a payment security review, certify PCI-DSS compliance, or operate on production cardholder data.

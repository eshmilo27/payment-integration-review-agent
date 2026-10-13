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

Requirements: Node.js 20+ locally. GitHub Actions uses Node.js 24 with `actions/checkout@v5` and `actions/setup-node@v5`. Use either a direct Groq key or the existing resume-site Lambda proxy.

```bash
npm install
npm run build

# Option A: direct Groq access.
GROQ_API_KEY=your-key npm start

# Option B: reuse the resume site's server-side key without copying it.
RESUME_AGENT_API_URL=https://your-resume-lambda-url/ npm start
```

Open `http://localhost:8080`. Never enter real cardholder data, credentials, secrets, or production payloads.

`.env.example` documents the supported environment variables; the application does not load `.env` files automatically.

When `RESUME_AGENT_API_URL` is set, the app sends each bounded specialist prompt to the resume Lambda's `agent-completion` operation. The Groq key remains in the Lambda environment and is never placed in this repository, the browser, or local environment variables.

## Evaluation and CI

`npm test` runs without a model key and covers:

- six-stage orchestration order
- strict output shape validation
- sensitive-data and secret rejection
- input limits
- malformed model output handling

GitHub Actions runs build, tests, and the same deterministic checks on every push and pull request. Optional live evaluations can be enabled with the repository variable `ENABLE_LIVE_EVALUATION=true` and the `GROQ_API_KEY` secret. The live workflow runs one complete six-call review so it remains within the Groq free-tier tokens-per-minute budget; deterministic tests cover all evaluation fixtures. The model client retries temporary `429` rate-limit responses using the provider's retry guidance. Live model evaluations should be treated as advisory because model output can vary.

If a live evaluation fails with `400: Failed to validate JSON`, the model provider rejected its generated structured response before the application could validate it. This is a provider/model-output issue, not evidence that the deterministic orchestration tests failed. Review the failed job log, then rerun the workflow after the provider quota window resets or adjust the configured `GROQ_MODEL`.

## How to see orchestration in GitHub Actions

GitHub Actions is the CI runner and control plane for this project. The `verify` job builds the TypeScript service and runs `npm test`; the orchestration test invokes the planner, payment-domain, security/compliance, reliability, test-design, and synthesis stages in order and fails if a handoff is malformed.

This workflow does **not** use the GitHub MCP server. GitHub MCP is a tool interface for an AI assistant to interact with GitHub. It is not required for the application agents or for GitHub Actions. Actions runs the repository's own TypeScript orchestrator on an ephemeral Node.js 24 runner. Open the repository's **Actions** tab, select **Agent evaluation**, and inspect the `verify` job logs to see the build and evaluation results. The workflow runs on pushes and pull requests and can also be started manually with **Run workflow** because it includes `workflow_dispatch`.

For live model evaluation, configure a repository secret named `GROQ_API_KEY` and set the repository variable `ENABLE_LIVE_EVALUATION` to `true`. The optional job runs `npm run live:evaluate` against the committed synthetic fixtures. It never prints the key. Live evaluation consumes model quota and should be treated as advisory because model output can vary; the deterministic checks remain the recommended pull-request gate.

To start a manual run:

```bash
gh workflow run ci.yml --repo eshmilo27/payment-integration-review-agent --ref master
gh run list --repo eshmilo27/payment-integration-review-agent --workflow ci.yml --limit 1
```

### Run delegated specialist agents

The separate `Delegated agent review` workflow demonstrates asynchronous multi-agent delegation. It starts five independent specialist jobs in parallel:

- planner
- payment-domain
- security/compliance
- reliability
- test-design

Each job makes one Groq call, validates its JSON result, and uploads a stage artifact. The dependent synthesis job downloads those artifacts, validates the handoffs, makes the final model call, and uploads `final-review.json`.

To run it from the GitHub CLI:

```bash
gh workflow run agent-review.yml \
  --repo eshmilo27/payment-integration-review-agent \
  --ref master \
  -f review_id=contactless-demo \
  -f scenario='A retailer wants to add contactless payments to its POS system over HTTPS.'
```

Then inspect the run and download its artifacts:

```bash
gh run list --repo eshmilo27/payment-integration-review-agent --workflow agent-review.yml --limit 1
gh run download RUN_ID --repo eshmilo27/payment-integration-review-agent
```

This workflow requires the `GROQ_API_KEY` repository secret. It is intended for demonstrations, batch reviews, and evaluation—not synchronous requests from the resume website. GitHub Actions executes the TypeScript agent scripts; GitHub MCP is not involved.

## Certificate-skill evidence

- **Integrating agents:** a browser application calls a server-side model adapter.
- **Orchestrating agents:** specialist stages execute independently and pass validated context to synthesis.
- **Reliability:** bounded input, timeouts, explicit errors, strict schemas, and deterministic regression tests.
- **Safety and governance:** synthetic-data-only policy, prompt boundaries, secret protection, human approval gate, and no unsupported compliance claims.
- **GitHub as control plane:** versioned prompts and code, pull-request CI, automated evaluation, and optional secret-gated live checks.

This project does not claim to replace a payment security review, certify PCI-DSS compliance, or operate on production cardholder data.

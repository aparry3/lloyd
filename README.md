# Lloyd

AI messaging proxy — connect SMS, WhatsApp, RCS, and email to intelligent agents via [`@agent-runner/core`](https://www.npmjs.com/package/@agent-runner/core).

## Architecture

Lloyd is a **messaging proxy** that sits between communication channels (Twilio SMS/RCS, WhatsApp Cloud API, SendGrid email) and an AI agent system powered by `@agent-runner/core`. Users sign up via a lightweight web UI, and all their messages are routed to the appropriate agent via `runner.invoke()`.

### How it works

1. Message arrives via webhook (Twilio, WhatsApp, SendGrid)
2. Lloyd resolves the sender to a user and conversation
3. `runner.invoke(agentId, messageText, { sessionId })` handles everything:
   - Loads conversation history from PostgreSQL (`@agent-runner/store-postgres`)
   - Builds prompt with system instructions + history + user input
   - Calls the LLM (OpenAI, Anthropic, or Google via AI SDK)
   - Executes tool calls in a loop
   - Persists new messages and logs automatically
4. Lloyd sends the response back via the original channel

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Monorepo:** pnpm + Turborepo
- **Database:** PostgreSQL + Kysely (Lloyd's tables) + `@agent-runner/store-postgres` (agent sessions/logs)
- **Messaging:** Twilio (SMS/RCS), WhatsApp Cloud API, SendGrid (email)
- **AI:** `@agent-runner/core` — `createRunner()`, `defineAgent()`, `defineTool()`
- **Model Providers:** `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript

## Project Structure

```
lloyd/
├── apps/
│   └── web/              # Next.js app (UI + API routes)
│       └── src/
│           ├── app/
│           │   ├── api/
│           │   │   └── webhooks/   # Twilio, WhatsApp, email endpoints
│           │   ├── signup/         # User signup flow
│           │   └── (dashboard)/    # Profile editing
│           ├── lib/
│           │   ├── agents/         # Runner singleton, agent definitions, tools
│           │   ├── messaging/      # Channel routing, Twilio/WhatsApp/email adapters
│           │   └── auth/           # Session management
│           └── components/         # React components
├── packages/
│   └── shared/           # Types, DB models, utilities
├── migrations/           # SQL migrations (Lloyd's tables only)
└── scripts/              # Dev tooling
```

## Getting Started

```bash
pnpm install
cp .env.example .env.local
# Fill in env vars (DATABASE_URL, OPENAI_API_KEY, TWILIO_*, etc.)
pnpm dev
```

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@agent-runner/core` | Agent definitions, runner, tools, sessions, streaming |
| `@agent-runner/store-postgres` | PostgreSQL persistence for agent state (auto-migrates) |
| `@ai-sdk/openai` | OpenAI model provider |
| `@ai-sdk/anthropic` | Anthropic model provider |
| `twilio` | SMS/RCS messaging |
| `zod` | Schema validation (tools + forms) |

## Environment Variables

See `.env.example` for required configuration.

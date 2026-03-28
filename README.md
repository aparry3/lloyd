# Lloyd

AI messaging proxy — connect SMS, WhatsApp, RCS, and email to intelligent agents via [agent-runner](https://www.npmjs.com/package/agent-runner).

## Architecture

Lloyd is a **messaging proxy** that sits between communication channels (Twilio SMS/RCS, WhatsApp Cloud API, SendGrid email) and an AI agent system powered by `agent-runner`. Users sign up via a lightweight web UI, and all their messages are routed to the appropriate agent.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Monorepo:** pnpm + Turborepo
- **Database:** PostgreSQL + Kysely
- **Messaging:** Twilio (SMS/RCS), WhatsApp Cloud API, SendGrid (email)
- **AI:** agent-runner
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
│           ├── lib/                # Business logic
│           └── components/         # React components
├── packages/
│   └── shared/           # Types, DB models, utilities
├── migrations/           # SQL migrations
└── scripts/              # Dev tooling
```

## Getting Started

```bash
pnpm install
cp .env.example .env.local
# Fill in env vars
pnpm dev
```

## Environment Variables

See `.env.example` for required configuration.

import { createRunner, defineAgent, type Runner } from '@agent-runner/core';
import { PostgresStore } from '@agent-runner/store-postgres';

let _runner: Runner | null = null;
let _store: PostgresStore | null = null;

/**
 * Returns a singleton Runner instance with PostgresStore backing.
 * The Lloyd assistant agent is registered on first call.
 */
export function getRunner(): Runner {
  if (!_runner) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required');
    }

    _store = new PostgresStore(process.env.DATABASE_URL);

    _runner = createRunner({
      store: _store,
    });

    // Register the default Lloyd assistant agent
    _runner.registerAgent(
      defineAgent({
        id: 'lloyd-assistant',
        name: 'Lloyd',
        systemPrompt: `You are Lloyd, a helpful personal assistant available via text, WhatsApp, and email.

You're conversational, concise, and genuinely helpful. Keep responses brief — this is a text conversation, not an essay. Use a friendly, natural tone.

You can help with:
- General questions and research
- Reminders and planning
- Quick calculations and conversions
- Writing and editing text
- Brainstorming ideas

If you can't help with something, say so honestly. Don't make things up.`,
        model: {
          provider: 'openai',
          name: 'gpt-4o-mini',
        },
      })
    );
  }

  return _runner;
}

export function getStore(): PostgresStore | null {
  return _store;
}

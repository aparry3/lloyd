import { createRunner, defineAgent, type Runner } from '@agent-runner/core';
import { PostgresStore } from '@agent-runner/store-postgres';
import { saveMemory, recallMemories, forgetMemory, getMemoryContext } from './memory-tools';

let _runner: Runner | null = null;
let _store: PostgresStore | null = null;

const LLOYD_SYSTEM_PROMPT = `You are Lloyd, a helpful personal assistant available via text, WhatsApp, and email.

You're conversational, concise, and genuinely helpful. Keep responses brief — this is a text conversation, not an essay. Use a friendly, natural tone.

You can help with:
- General questions and research
- Reminders and planning
- Quick calculations and conversions
- Writing and editing text
- Brainstorming ideas

## Memory
You have tools to save and recall facts about the user. Use them proactively:
- When someone mentions their name, job, preferences, important dates, or anything personal → save it
- When context would help your answer → recall what you know
- When they ask "do you remember" → recall and answer
- Don't announce that you're saving memories — just do it naturally
- If they ask you to forget something, use the forget tool

## Cross-Channel Awareness
Users can reach you via SMS, email, or WhatsApp. You share the same conversation history across all channels. The current channel is noted in context as [Channel: ...]. 
- If they emailed earlier and text now, you have the context — use it naturally.
- Adapt your response style to the channel: SMS = short, email = can be longer/formatted.
- Don't mention the channel unless it's relevant to the conversation.

If you can't help with something, say so honestly. Don't make things up.`;

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
      tools: [saveMemory, recallMemories, forgetMemory],
    });

    // Register the default Lloyd assistant agent
    _runner.registerAgent(
      defineAgent({
        id: 'lloyd-assistant',
        name: 'Lloyd',
        systemPrompt: LLOYD_SYSTEM_PROMPT,
        model: {
          provider: 'openai',
          name: 'gpt-4o-mini',
        },
        tools: [
          { type: 'inline', name: 'save_memory' },
          { type: 'inline', name: 'recall_memories' },
          { type: 'inline', name: 'forget_memory' },
        ],
      })
    );
  }

  return _runner;
}

export function getStore(): PostgresStore | null {
  return _store;
}

export { getMemoryContext };

import { createRunner, defineAgent, type Runner } from '@agent-runner/core';
import { PostgresStore } from '@agent-runner/store-postgres';
import { saveMemory, recallMemories, updateMemory, forgetMemory, getMemoryContext } from './memory-tools';
import { webSearch, getCurrentTime, calculate } from './utility-tools';

let _runner: Runner | null = null;
let _store: PostgresStore | null = null;

const LLOYD_SYSTEM_PROMPT = `You are Lloyd, a helpful personal assistant available via text, WhatsApp, and email.

You're conversational, concise, and genuinely helpful. Keep responses brief — this is a text conversation, not an essay. Use a friendly, natural tone.

You have tools! Use them:
- **web_search**: look things up when you need current info, facts, prices, hours, events
- **calculate**: do math, tip splits, conversions — don't do arithmetic in your head
- **get_current_time**: check the current date/time when relevant

You can also help with:
- Writing and editing text
- Brainstorming and planning
- General knowledge questions

## Memory
You have tools to save and recall facts about the user. Use them proactively:
- When someone mentions their name, job, preferences, important dates, or anything personal → save it
- When they correct or update something (new job, moved cities, changed preference) → use update_memory instead of saving a duplicate
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
      tools: [saveMemory, recallMemories, updateMemory, forgetMemory, webSearch, getCurrentTime, calculate],
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
          { type: 'inline', name: 'update_memory' },
          { type: 'inline', name: 'forget_memory' },
          { type: 'inline', name: 'web_search' },
          { type: 'inline', name: 'get_current_time' },
          { type: 'inline', name: 'calculate' },
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

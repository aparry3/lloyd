import { defineTool } from '@agent-runner/core';
import { getDb } from '@lloyd/shared/server';
import { z } from 'zod';

const saveMemoryInput = z.object({
  content: z.string().describe('The fact or preference to remember'),
  category: z
    .enum(['preference', 'fact', 'reminder', 'general'])
    .default('general')
    .describe('Category of the memory'),
  importance: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('How important this is (1=trivial, 10=critical)'),
});

const recallMemoriesInput = z.object({
  category: z
    .enum(['preference', 'fact', 'reminder', 'general', 'all'])
    .default('all')
    .describe('Filter by category, or "all" for everything'),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(20)
    .describe('Maximum number of memories to return'),
});

const forgetMemoryInput = z.object({
  content: z
    .string()
    .describe('The content of the memory to delete (partial match)'),
});

/**
 * Tool: save a memory/fact about the current user.
 */
export const saveMemory = defineTool({
  name: 'save_memory',
  description:
    'Save a fact or preference about the user for future reference. Use this when the user tells you something worth remembering (their name, preferences, important dates, context about their life).',
  input: saveMemoryInput as z.ZodSchema,
  async execute(input: unknown, ctx) {
    const { content, category, importance } = input as z.infer<typeof saveMemoryInput>;
    const userId = (ctx as any).userId;
    if (!userId) return { error: 'No user context' };

    const db = getDb();
    await db
      .insertInto('lloyd_user_memories')
      .values({
        user_id: userId,
        content,
        category,
        importance,
      })
      .execute();

    return { saved: true, content };
  },
});

/**
 * Tool: recall memories about the current user.
 */
export const recallMemories = defineTool({
  name: 'recall_memories',
  description:
    'Recall saved facts and preferences about the user. Use this when you need context about them or they ask "do you remember..."',
  input: recallMemoriesInput as z.ZodSchema,
  async execute(input: unknown, ctx) {
    const { category, limit } = input as z.infer<typeof recallMemoriesInput>;
    const userId = (ctx as any).userId;
    if (!userId) return { memories: [] };

    const db = getDb();
    let query = db
      .selectFrom('lloyd_user_memories')
      .select(['content', 'category', 'importance', 'created_at'])
      .where('user_id', '=', userId)
      .orderBy('importance', 'desc')
      .orderBy('updated_at', 'desc')
      .limit(limit);

    if (category !== 'all') {
      query = query.where('category', '=', category);
    }

    const memories = await query.execute();
    return { memories };
  },
});

/**
 * Tool: forget/delete a specific memory.
 */
export const forgetMemory = defineTool({
  name: 'forget_memory',
  description:
    'Delete a saved memory about the user. Use when they ask you to forget something or correct outdated info.',
  input: forgetMemoryInput as z.ZodSchema,
  async execute(input: unknown, ctx) {
    const { content } = input as z.infer<typeof forgetMemoryInput>;
    const userId = (ctx as any).userId;
    if (!userId) return { error: 'No user context' };

    const db = getDb();
    const deleted = await db
      .deleteFrom('lloyd_user_memories')
      .where('user_id', '=', userId)
      .where('content', 'ilike', `%${content}%`)
      .executeTakeFirst();

    return {
      deleted: Number(deleted.numDeletedRows ?? 0),
      searchTerm: content,
    };
  },
});

/**
 * Fetch top memories for a user to inject into the system prompt.
 * Called at the start of each conversation turn.
 */
export async function getMemoryContext(userId: string): Promise<string> {
  const db = getDb();
  const memories = await db
    .selectFrom('lloyd_user_memories')
    .select(['content', 'category'])
    .where('user_id', '=', userId)
    .orderBy('importance', 'desc')
    .orderBy('updated_at', 'desc')
    .limit(30)
    .execute();

  if (memories.length === 0) return '';

  const grouped: Record<string, string[]> = {};
  for (const m of memories) {
    const cat = m.category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(m.content);
  }

  let ctx = '\n\n## What you know about this user:\n';
  for (const [cat, items] of Object.entries(grouped)) {
    ctx += `\n**${cat}:**\n`;
    for (const item of items) {
      ctx += `- ${item}\n`;
    }
  }
  return ctx;
}

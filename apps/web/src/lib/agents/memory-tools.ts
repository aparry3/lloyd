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

const updateMemoryInput = z.object({
  searchContent: z
    .string()
    .describe('Partial match to find the existing memory to update'),
  newContent: z
    .string()
    .describe('The updated content to replace the old memory with'),
  category: z
    .enum(['preference', 'fact', 'reminder', 'general'])
    .optional()
    .describe('Optionally change the category'),
  importance: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .describe('Optionally change the importance'),
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
 * Tool: update an existing memory (avoids duplicates).
 */
export const updateMemory = defineTool({
  name: 'update_memory',
  description:
    'Update an existing saved memory. Use this instead of save_memory when the user corrects or updates something you already know (e.g., they changed jobs, moved cities, updated a preference). Finds the old memory by partial match and replaces its content.',
  input: updateMemoryInput as z.ZodSchema,
  async execute(input: unknown, ctx) {
    const { searchContent, newContent, category, importance } = input as z.infer<typeof updateMemoryInput>;
    const userId = (ctx as any).userId;
    if (!userId) return { error: 'No user context' };

    const db = getDb();

    // Find the matching memory
    const existing = await db
      .selectFrom('lloyd_user_memories')
      .select(['id', 'content'])
      .where('user_id', '=', userId)
      .where('content', 'ilike', `%${searchContent}%`)
      .orderBy('updated_at', 'desc')
      .executeTakeFirst();

    if (!existing) {
      return { updated: false, reason: 'No matching memory found. Use save_memory to create a new one.' };
    }

    const updateValues: Record<string, unknown> = {
      content: newContent,
      updated_at: new Date(),
    };
    if (category) updateValues.category = category;
    if (importance) updateValues.importance = importance;

    await db
      .updateTable('lloyd_user_memories')
      .set(updateValues)
      .where('id', '=', existing.id)
      .execute();

    return { updated: true, old: existing.content, new: newContent };
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

import { defineTool } from '@agent-runner/core';
import { getDb } from '@lloyd/shared/server';
import { z } from 'zod';

// ── Tool definitions ─────────────────────────────────────────────────────────

const addTodoInput = z.object({
  content: z.string().describe('The task or item to add'),
  category: z.string().default('general')
    .describe('Category/list name (e.g., "groceries", "work", "personal", "general")'),
  priority: z.enum(['normal', 'high', 'urgent']).default('normal')
    .describe('Priority level'),
  dueDate: z.string().optional()
    .describe('Optional due date in YYYY-MM-DD format'),
});

export const addTodo = defineTool({
  name: 'add_todo',
  description:
    'Add an item to the user\'s to-do list. Use when they say "add X to my list", "remind me to buy...", "I need to...", "todo: ...", etc. Supports categories for organizing items (e.g., groceries, work, personal).',
  input: addTodoInput as z.ZodSchema,
  async execute(input: unknown, ctx) {
    const params = input as z.infer<typeof addTodoInput>;
    const userId = (ctx as any).userId;
    if (!userId) return { error: 'No user context' };

    const priorityMap = { normal: 0, high: 1, urgent: 2 };

    const db = getDb();
    const result = await db
      .insertInto('lloyd_todos')
      .values({
        user_id: userId,
        content: params.content,
        category: params.category.toLowerCase(),
        priority: priorityMap[params.priority],
        due_date: params.dueDate || null,
      })
      .returning(['id', 'content', 'category', 'priority'])
      .executeTakeFirstOrThrow();

    return {
      added: true,
      id: result.id,
      content: result.content,
      category: result.category,
    };
  },
});

const listTodosInput = z.object({
  category: z.string().optional()
    .describe('Filter by category (e.g., "groceries"). Omit for all categories.'),
  includeCompleted: z.boolean().default(false)
    .describe('Include completed items'),
  limit: z.number().min(1).max(50).default(20)
    .describe('Max items to return'),
});

export const listTodos = defineTool({
  name: 'list_todos',
  description:
    'Show the user\'s to-do list. Use when they ask "what\'s on my list?", "show my todos", "what do I need to do?", "my groceries list", etc.',
  input: listTodosInput as z.ZodSchema,
  async execute(input: unknown, ctx) {
    const params = input as z.infer<typeof listTodosInput>;
    const userId = (ctx as any).userId;
    if (!userId) return { todos: [] };

    const db = getDb();
    let query = db
      .selectFrom('lloyd_todos')
      .select(['id', 'content', 'category', 'priority', 'completed', 'due_date', 'created_at'])
      .where('user_id', '=', userId)
      .orderBy('completed', 'asc')
      .orderBy('priority', 'desc')
      .orderBy('created_at', 'desc')
      .limit(params.limit);

    if (params.category) {
      query = query.where('category', '=', params.category.toLowerCase());
    }

    if (!params.includeCompleted) {
      query = query.where('completed', '=', false);
    }

    const todos = await query.execute();

    // Group by category for nicer display
    const grouped: Record<string, typeof todos> = {};
    for (const todo of todos) {
      const cat = todo.category || 'general';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(todo);
    }

    return { todos, grouped, total: todos.length };
  },
});

const completeTodoInput = z.object({
  content: z.string().describe('Partial match of the todo item to mark as done'),
});

export const completeTodo = defineTool({
  name: 'complete_todo',
  description:
    'Mark a to-do item as completed. Use when the user says "done with X", "finished X", "check off X", "completed X".',
  input: completeTodoInput as z.ZodSchema,
  async execute(input: unknown, ctx) {
    const { content } = input as z.infer<typeof completeTodoInput>;
    const userId = (ctx as any).userId;
    if (!userId) return { error: 'No user context' };

    const db = getDb();
    const result = await db
      .updateTable('lloyd_todos')
      .set({
        completed: true,
        completed_at: new Date(),
        updated_at: new Date(),
      })
      .where('user_id', '=', userId)
      .where('completed', '=', false)
      .where('content', 'ilike', `%${content}%`)
      .executeTakeFirst();

    const count = Number(result.numUpdatedRows ?? 0);
    return { completed: count, searchTerm: content };
  },
});

const removeTodoInput = z.object({
  content: z.string().describe('Partial match of the todo item to remove'),
});

export const removeTodo = defineTool({
  name: 'remove_todo',
  description:
    'Remove a to-do item entirely (not just complete it). Use when the user says "remove X from my list", "delete X", "never mind about X".',
  input: removeTodoInput as z.ZodSchema,
  async execute(input: unknown, ctx) {
    const { content } = input as z.infer<typeof removeTodoInput>;
    const userId = (ctx as any).userId;
    if (!userId) return { error: 'No user context' };

    const db = getDb();
    const result = await db
      .deleteFrom('lloyd_todos')
      .where('user_id', '=', userId)
      .where('content', 'ilike', `%${content}%`)
      .executeTakeFirst();

    const count = Number(result.numDeletedRows ?? 0);
    return { removed: count, searchTerm: content };
  },
});

const clearTodosInput = z.object({
  category: z.string().optional()
    .describe('Clear only this category. Omit to clear all completed items.'),
  completedOnly: z.boolean().default(true)
    .describe('If true, only clear completed items. If false, clear everything (use with caution).'),
});

export const clearTodos = defineTool({
  name: 'clear_todos',
  description:
    'Clear completed items from the to-do list, or clear an entire category. Use when the user says "clear my list", "clean up my todos", "clear completed items".',
  input: clearTodosInput as z.ZodSchema,
  async execute(input: unknown, ctx) {
    const params = input as z.infer<typeof clearTodosInput>;
    const userId = (ctx as any).userId;
    if (!userId) return { error: 'No user context' };

    const db = getDb();
    let query = db
      .deleteFrom('lloyd_todos')
      .where('user_id', '=', userId);

    if (params.category) {
      query = query.where('category', '=', params.category.toLowerCase());
    }

    if (params.completedOnly) {
      query = query.where('completed', '=', true);
    }

    const result = await query.executeTakeFirst();
    const count = Number(result.numDeletedRows ?? 0);
    return { cleared: count, category: params.category || 'all', completedOnly: params.completedOnly };
  },
});

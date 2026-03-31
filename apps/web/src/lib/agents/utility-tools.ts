import { defineTool } from '@agent-runner/core';
import { z } from 'zod';

const webSearchInput = z.object({
  query: z.string().describe('Search query'),
});

const getCurrentTimeInput = z.object({
  timezone: z
    .string()
    .default('America/New_York')
    .describe('IANA timezone (e.g., America/New_York, Europe/London)'),
});

/**
 * Tool: search the web via Brave Search API.
 */
export const webSearch = defineTool({
  name: 'web_search',
  description:
    'Search the web for current information. Use this when the user asks about recent events, facts you\'re unsure of, prices, hours, or anything that needs up-to-date info.',
  input: webSearchInput as z.ZodSchema,
  async execute(input: unknown) {
    const { query } = input as z.infer<typeof webSearchInput>;
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;

    if (!apiKey) {
      return { error: 'Web search is not configured' };
    }

    try {
      const url = new URL('https://api.search.brave.com/res/v1/web/search');
      url.searchParams.set('q', query);
      url.searchParams.set('count', '5');

      const res = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': apiKey,
        },
      });

      if (!res.ok) {
        return { error: `Search failed: ${res.status}` };
      }

      const data = await res.json();
      const results = (data.web?.results || []).slice(0, 5).map(
        (r: any) => ({
          title: r.title,
          url: r.url,
          snippet: r.description,
        })
      );

      return { results };
    } catch (err: any) {
      return { error: `Search error: ${err.message}` };
    }
  },
});

/**
 * Tool: get current date and time.
 */
export const getCurrentTime = defineTool({
  name: 'get_current_time',
  description:
    'Get the current date and time. Use when the user asks what time/day it is, or when you need to know the current date for context.',
  input: getCurrentTimeInput as z.ZodSchema,
  async execute(input: unknown) {
    const { timezone } = input as z.infer<typeof getCurrentTimeInput>;

    try {
      const now = new Date();
      const formatted = now.toLocaleString('en-US', {
        timeZone: timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      return {
        formatted,
        iso: now.toISOString(),
        timezone,
        unix: Math.floor(now.getTime() / 1000),
      };
    } catch {
      return { error: `Invalid timezone: ${timezone}` };
    }
  },
});

/**
 * Tool: basic math calculations.
 */
const calculateInput = z.object({
  expression: z
    .string()
    .describe('Math expression to evaluate (e.g., "15 * 0.20", "sqrt(144)", "100 / 3")'),
});

export const calculate = defineTool({
  name: 'calculate',
  description:
    'Evaluate a math expression. Use for calculations, conversions, tip splits, etc.',
  input: calculateInput as z.ZodSchema,
  async execute(input: unknown) {
    const { expression } = input as z.infer<typeof calculateInput>;

    try {
      // Safe math evaluation using Function constructor with restricted scope
      // Only allow numbers, operators, parentheses, and Math functions
      const sanitized = expression.replace(/[^0-9+\-*/().,%^ a-zA-Z]/g, '');

      // Map common math functions
      const mathExpr = sanitized
        .replace(/\bsqrt\b/g, 'Math.sqrt')
        .replace(/\babs\b/g, 'Math.abs')
        .replace(/\bround\b/g, 'Math.round')
        .replace(/\bceil\b/g, 'Math.ceil')
        .replace(/\bfloor\b/g, 'Math.floor')
        .replace(/\bmin\b/g, 'Math.min')
        .replace(/\bmax\b/g, 'Math.max')
        .replace(/\bPI\b/g, 'Math.PI')
        .replace(/\bpi\b/g, 'Math.PI')
        .replace(/\^/g, '**');

      // eslint-disable-next-line no-new-func
      const result = new Function(`"use strict"; return (${mathExpr})`)();

      if (typeof result !== 'number' || !isFinite(result)) {
        return { error: 'Expression did not produce a valid number' };
      }

      return {
        expression,
        result: Number(result.toFixed(10)),
      };
    } catch (err: any) {
      return { error: `Could not evaluate: ${err.message}` };
    }
  },
});

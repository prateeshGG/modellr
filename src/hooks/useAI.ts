import type { Table, Relationship } from '../types/schema';
import { chat, type ChatMessage } from '../lib/aiClient';
import { buildModifyMessages, parseOperationsResponse, type ParsedModification } from '../lib/aiPrompts';

// AI calls go straight from the browser to the user's own OpenAI-compatible endpoint
// (see src/lib/aiConfig.ts / aiClient.ts). There is no backend, auth or quota involved.

export type ModifyResult = ParsedModification;

/**
 * Ask the model for structural operations that modify the current schema.
 * Returns validated operations ready for `applyAIOperations` (unknown/malformed ones are dropped).
 */
export async function requestSchemaModifications(
  prompt: string,
  tables: Table[],
  relationships: Relationship[],
  options: { history?: ChatMessage[]; signal?: AbortSignal } = {},
): Promise<ModifyResult> {
  const text = await chat({
    messages: buildModifyMessages(prompt, tables, relationships, options.history),
    signal: options.signal,
    maxTokens: 4000,
    temperature: 0.1,
    jsonMode: true,
    timeoutMs: 180_000,
  });
  return parseOperationsResponse(text);
}

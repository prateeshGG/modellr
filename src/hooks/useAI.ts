import { useState, useCallback, useRef, useEffect } from 'react';
import type { Table, Relationship } from '../types/schema';
import { chat, streamChat, isAbortError, errorMessage, type ChatMessage } from '../lib/aiClient';
import {
  buildSuggestMessages,
  buildDescribeMessages,
  buildGenerateMessages,
  buildModifyMessages,
  parseGeneratedSchema,
  parseOperationsResponse,
  type GeneratedSchema,
  type ParsedModification,
} from '../lib/aiPrompts';

// AI calls go straight from the browser to the user's own OpenAI-compatible endpoint
// (see src/lib/aiConfig.ts / aiClient.ts). There is no backend, auth or quota involved.

export type AIStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

export interface AIResult {
  text: string;
  status: AIStatus;
  error?: string;
  abort: () => void;
  /** (Re)start the request. */
  run: () => Promise<void>;
}

/** Suggest missing fields, indexes and improvements for a table (streams the answer). */
export function useSuggestFields(
  table: Table,
  allTables: Table[],
  relationships: Relationship[],
): AIResult {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<AIStatus>('idle');
  const [error, setError] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setText('');
    setStatus('loading');
    setError(undefined);

    try {
      await streamChat({
        messages: buildSuggestMessages(table, allTables, relationships),
        signal: ctrl.signal,
        maxTokens: 800,
        temperature: 0.4,
        onToken: (chunk) => {
          if (ctrl.signal.aborted) return;
          setStatus('streaming');
          setText((t) => t + chunk);
        },
      });
      if (!ctrl.signal.aborted) setStatus('done');
    } catch (e) {
      if (ctrl.signal.aborted || isAbortError(e)) { setStatus('idle'); return; }
      setError(errorMessage(e));
      setStatus('error');
    }
  }, [table, allTables, relationships]);

  const abort = useCallback(() => abortRef.current?.abort(), []);

  return { text, status, error, abort, run };
}

/** Describe what a single field does based on its name, type, and table context */
export function useDescribeField(
  fieldName: string,
  fieldType: string,
  tableName: string,
): { describe: () => Promise<string> } {
  return {
    describe: async () => {
      try {
        const text = await chat({
          messages: buildDescribeMessages(tableName, fieldName, fieldType),
          maxTokens: 80,
          temperature: 0.3,
          timeoutMs: 30_000,
        });
        return text.trim() || 'No description available.';
      } catch {
        return 'No description available.';
      }
    },
  };
}

/** Generate a full schema from a natural language description. Throws Error with a friendly message. */
export async function generateSchemaFromPrompt(
  prompt: string,
  signal?: AbortSignal,
): Promise<GeneratedSchema> {
  const text = await chat({
    messages: buildGenerateMessages(prompt),
    signal,
    maxTokens: 3000,
    temperature: 0.2,
    jsonMode: true,
    timeoutMs: 180_000,
  });
  return parseGeneratedSchema(text); // tolerant of ```json fences / leading prose
}

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

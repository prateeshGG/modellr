/**
 * useAI — streaming AI calls for schema intelligence.
 * All requests are proxied through the EC2 backend (/api/openai/*).
 * The OpenAI API key lives exclusively on the server — never in the browser bundle.
 */
import { useState, useCallback, useRef } from 'react';
import type { Table, Relationship } from '../types/schema';

// Always route AI calls through our EC2 backend — the API key lives there securely.
// VITE_API_URL is set in Vercel env vars → https://13-61-7-14.sslip.io
// Falls back to empty string (relative path) in local dev where Vite proxies it.
function getBackendBase(): string {
  return (import.meta as any).env?.VITE_API_URL ?? '';
}

export type AIStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

export interface AIResult {
  text: string;
  status: AIStatus;
  error?: string;
  abort: () => void;
}

function tableToText(table: Table): string {
  return `Table "${table.name}" (${table.fields
    .map((f) => `${f.name} ${f.type}${f.isPK ? ' PK' : ''}${f.isFK ? ' FK' : ''}${!f.nullable ? ' NOT NULL' : ''}${f.unique ? ' UNIQUE' : ''}`)
    .join(', ')})`;
}

/** Proxy a streaming chat completion through our EC2 backend */
async function streamCompletion(
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void,
  signal: AbortSignal
): Promise<void> {
  const res = await fetch(`${getBackendBase()}/api/openai/stream`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, max_tokens: 800, temperature: 0.4 }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error ?? `AI error ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split('\n');
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta;
        if (delta) {
          const chunkText = delta.content || '';
          if (chunkText) onChunk(chunkText);
        }
      } catch { /* ignore parse errors */ }
    }
  }
}

/** Suggest missing fields, indexes and improvements for a table */
export function useSuggestFields(
  table: Table,
  allTables: Table[],
  relationships: Relationship[]
): AIResult {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<AIStatus>('idle');
  const [error, setError] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setText('');
    setStatus('loading');
    setError(undefined);

    const context = allTables.map(tableToText).join('\n');
    const relContext = relationships.length
      ? `\nRelationships:\n${relationships.map((r) => {
        const src = allTables.find((t) => t.id === r.sourceTableId)?.name ?? r.sourceTableId;
        const tgt = allTables.find((t) => t.id === r.targetTableId)?.name ?? r.targetTableId;
        return `${src} → ${tgt} (${r.cardinality})`;
      }).join('\n')}`
      : '';

    const messages = [
      {
        role: 'system',
        content: `You are a senior database architect. Analyze database schemas and provide concise, actionable suggestions.
Format your response with clear sections using emoji:
📋 Missing Fields — list columns this table likely needs
🔑 Suggested Indexes — columns worth indexing
⚡ Normalization Tips — structural improvements
💡 Best Practices — data integrity tips
Keep each point brief (1-2 lines). Be practical, not theoretical.`,
      },
      {
        role: 'user',
        content: `Full schema context:\n${context}${relContext}\n\nFocus on this table:\n${tableToText(table)}\n\nProvide specific, actionable suggestions for improving this table.`,
      },
    ];

    try {
      setStatus('streaming');
      await streamCompletion(messages, (chunk) => setText((t) => t + chunk), ctrl.signal);
      setStatus('done');
    } catch (e: any) {
      if (e.name === 'AbortError') { setStatus('idle'); return; }
      setError(e.message ?? 'Unknown error');
      setStatus('error');
    }
  }, [table, allTables, relationships]);

  // Auto-run on mount
  const hasRun = useRef(false);
  const startIfNotStarted = useCallback(() => {
    if (!hasRun.current) { hasRun.current = true; run(); }
  }, [run]);

  return {
    text,
    status,
    error,
    abort: () => abortRef.current?.abort(),
    // Expose run so callers can trigger manually
    ...(({ run, startIfNotStarted } as any)),
  };
}

/** Describe what a single field does based on its name, type, and table context */
export function useDescribeField(
  fieldName: string,
  fieldType: string,
  tableName: string
): { describe: () => Promise<string> } {
  return {
    describe: async () => {
      try {
        const res = await fetch(`${getBackendBase()}/api/openai/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            max_tokens: 60,
            temperature: 0.3,
            messages: [
              {
                role: 'system',
                content: 'You are a helpful database documentation assistant. Write one concise sentence (max 20 words) describing what a database column is used for.',
              },
              {
                role: 'user',
                content: `Table: ${tableName}\nField: ${fieldName} (${fieldType})\nWrite a one-sentence description.`,
              },
            ],
          }),
        });
        // This is a non-streaming call treated as streaming — collect all chunks
        if (!res.ok) return 'No description available.';
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let result = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value).split('\n')) {
            if (!line.startsWith('data:')) continue;
            const d = line.slice(5).trim();
            if (d === '[DONE]') break;
            try {
              const j = JSON.parse(d);
              result += j.choices?.[0]?.delta?.content || '';
            } catch { /* */ }
          }
        }
        return result.trim() || 'No description available.';
      } catch {
        return 'No description available.';
      }
    },
  };
}

/** Generate a full schema from a natural language description */
export async function generateSchemaFromPrompt(
  prompt: string,
  signal?: AbortSignal
): Promise<{ tables: { name: string; fields: { name: string; type: string; isPK?: boolean; isFK?: boolean; nullable?: boolean; unique?: boolean; references?: string }[] }[]; relationships: { from: string; fromField: string; to: string; toField: string; cardinality: string }[] }> {
  const res = await fetch(`${getBackendBase()}/api/openai/generate`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error ?? `AI error ${res.status}`);
  }

  const data = await res.json();
  let raw = data.choices?.[0]?.message?.content ?? '{}';

  // Clean markdown if wrapped in ```json ... ```
  if (raw.includes('```json')) {
    raw = raw.split('```json')[1].split('```')[0].trim();
  } else if (raw.includes('```')) {
    raw = raw.split('```')[1].split('```')[0].trim();
  }

  return JSON.parse(raw);
}

/**
 * useAI — streaming OpenAI calls for schema intelligence.
 * Uses GPT-4o-mini via the OpenAI Chat Completions API.
 * API key is read from import.meta.env.VITE_OPENAI_API_KEY.
 */
import { useState, useCallback, useRef } from 'react';
import type { Table, Relationship } from '../types/schema';



function getKey(): string {
  return (import.meta as any).env?.VITE_OPENAI_API_KEY ?? '';
}

// Use Vite proxy path /api/openai in dev to avoid CORS; direct in prod
function getEndpoint(): string {
  const isDev = (import.meta as any).env?.DEV;
  return isDev
    ? '/api/openai/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
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

/** Stream a chat completion from the OpenAI API */
async function streamCompletion(
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void,
  signal: AbortSignal
): Promise<void> {
  const key = getKey();
  if (!key) throw new Error('No OpenAI API key configured (VITE_OPENAI_API_KEY).');

  const res = await fetch(getEndpoint(), {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      stream: true,
      max_tokens: 800,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `OpenAI error ${res.status}`);
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
          const chunkText = delta.reasoning_content || delta.content || '';
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
      const key = getKey();
      if (!key) return 'No API key configured.';

      const res = await fetch(getEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
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
          max_tokens: 60,
          temperature: 0.3,
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() ?? 'No description available.';
    },
  };
}

/** Generate a full schema from a natural language description */
export async function generateSchemaFromPrompt(
  prompt: string,
  signal?: AbortSignal
): Promise<{ tables: { name: string; fields: { name: string; type: string; isPK?: boolean; isFK?: boolean; nullable?: boolean; unique?: boolean; references?: string }[] }[]; relationships: { from: string; fromField: string; to: string; toField: string; cardinality: string }[] }> {
  const key = getKey();
  if (!key) throw new Error('No OpenAI API key configured.');

  const res = await fetch(getEndpoint(), {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a database schema designer. Given a description, output a JSON schema object.

Rules:
- Output ONLY valid JSON, no markdown, no explanation
- Use snake_case for all table and field names
- Include appropriate id field (bigserial PK) for each table
- Include created_at (timestamptz) for important tables
- Use realistic PostgreSQL types: text, varchar, integer, bigint, bigserial, boolean, timestamptz, numeric, jsonb, uuid
- Infer foreign key relationships from context

Output format:
{
  "tables": [
    {
      "name": "table_name",
      "fields": [
        { "name": "id", "type": "bigserial", "isPK": true, "nullable": false },
        { "name": "field_name", "type": "text", "nullable": false }
      ]
    }
  ],
  "relationships": [
    { "from": "orders", "fromField": "customer_id", "to": "customers", "toField": "id", "cardinality": "one-to-many" }
  ]
}`,
        },
        {
          role: 'user',
          content: `Design a database schema for: ${prompt}`,
        },
      ],
      max_tokens: 1200,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `OpenAI error ${res.status}`);
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

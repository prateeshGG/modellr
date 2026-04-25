import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSchemaStore } from '../../store/schema';
import type { Table, Relationship } from '../../types/schema';
import type { AIStatus } from '../../hooks/useAI';
import { generateSchemaFromPrompt } from '../../hooks/useAI';
import { getBackendBase } from '../../lib/api-utils';
import { getAuthHeader } from '../../lib/auth-utils';
import './AISuggest.css';

function tableToText(table: Table): string {
  return `Table "${table.name}" (${table.fields
    .map((f) => `${f.name} ${f.type}${f.isPK ? ' PK' : ''}${f.isFK ? ' FK' : ''}${!f.nullable ? ' NOT NULL' : ''}${f.unique ? ' UNIQUE' : ''}`)
    .join(', ')})`;
}

/* ── AI Suggestions panel (for a specific table) ── */
interface AISuggestPanelProps {
  table: Table;
  onClose: () => void;
}

export const AISuggestPanel: React.FC<AISuggestPanelProps> = ({ table, onClose }) => {
  const { tables, relationships } = useSchemaStore() as any;
  const [text, setText] = useState('');
  const [status, setStatus] = useState<AIStatus>('idle');
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setText('');
    setError('');
    setStatus('loading');

    const context = (tables as Table[]).map(tableToText).join('\n');
    const relContext = (relationships as Relationship[]).length
      ? `\nRelationships:\n${(relationships as Relationship[]).map((r: Relationship) => {
        const src = (tables as Table[]).find((t: Table) => t.id === r.sourceTableId)?.name ?? r.sourceTableId;
        const tgt = (tables as Table[]).find((t: Table) => t.id === r.targetTableId)?.name ?? r.targetTableId;
        return `${src} → ${tgt} (${r.cardinality})`;
      }).join('\n')}`
      : '';

    try {
      const res = await fetch(`${getBackendBase()}/api/openai/stream`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a senior database architect. Analyze a database table and provide concise, actionable suggestions.
Format your response with these sections (use the exact emoji headers):
📋 Missing Fields — list specific columns this table likely needs, with types
🔑 Indexes — which columns should be indexed and why
⚡ Normalization — structural improvements if any
💡 Best Practices — data integrity, naming, or constraint tips
Keep each point to 1-2 sentences. Be direct and practical.`,
            },
            {
              role: 'user',
              content: `Full schema:\n${context}${relContext}\n\nAnalyze this table:\n${tableToText(table)}`,
            },
          ],
          max_tokens: 800,
          temperature: 0.4,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error?.message ?? `OpenAI API error ${res.status}`);
      }

      setStatus('streaming');
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') { setStatus('done'); return; }
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta;
            if (delta) {
              const chunkText = delta.reasoning_content || delta.content || '';
              if (chunkText) setText((t) => t + chunkText);
            }
          } catch { /* ignore */ }
        }
      }
      setStatus('done');
    } catch (e: any) {
      if (e.name === 'AbortError') { setStatus('idle'); return; }
      setError(e.message ?? 'Unknown error');
      setStatus('error');
    }
  }, [table, tables, relationships]);

  useEffect(() => { run(); return () => abortRef.current?.abort(); }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [text]);

  const formattedText = text
    .replace(/📋/g, '\n📋')
    .replace(/🔑/g, '\n🔑')
    .replace(/⚡/g, '\n⚡')
    .replace(/💡/g, '\n💡');

  return (
    <div className="ai-panel">
      <div className="ai-panel__header">
        <span className="ai-panel__title">
          <span className="ai-mark">✦</span> AI Analysis: {table.name}
        </span>
        <div className="ai-panel__actions">
          {(status === 'streaming' || status === 'loading') ? (
            <button className="ai-panel__action" onClick={() => { abortRef.current?.abort(); setStatus('idle'); }}>
              ⏹ Stop
            </button>
          ) : (
            <button className="ai-panel__action" onClick={run} title="Regenerate">
              ↺ Retry
            </button>
          )}
          <button className="ai-panel__close" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="ai-panel__body" ref={scrollRef}>
        {status === 'loading' && (
          <div className="ai-thinking">
            <span className="ai-dot" /><span className="ai-dot" /><span className="ai-dot" />
            <span>Analyzing schema…</span>
          </div>
        )}

        {error && (
          <div className="ai-error">
            <span className="ai-error__icon">⚠</span>
            <span>{error}</span>
            <button onClick={run}>Retry</button>
          </div>
        )}

        {(status === 'streaming' || status === 'done') && text && (
          <div className="ai-result">
            {formattedText.split('\n').filter(Boolean).map((line, i) => {
              const isHeader = /^[📋🔑⚡💡]/.test(line);
              if (isHeader) {
                return <div key={i} className="ai-result__section-header">{line.trim()}</div>;
              }
              const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•');
              return (
                <div key={i} className={`ai-result__line ${isBullet ? 'ai-result__line--bullet' : ''}`}>
                  {line.trim()}
                </div>
              );
            })}
            {status === 'streaming' && <span className="ai-cursor">▌</span>}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── AI Generate Schema Dialog ─────────────────── */
interface AIGenerateDialogProps {
  onClose: () => void;
}

export const AIGenerateDialog: React.FC<AIGenerateDialogProps> = ({ onClose }) => {
  const { importTables } = useSchemaStore() as any;
  const { addRelationship } = useSchemaStore() as any;
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<AIStatus>('idle');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const generate = useCallback(async () => {
    if (!prompt.trim()) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStatus('loading');
    setError('');
    setPreview([]);

    try {
      const { nanoid } = await import('../../store/nanoid');
      const { ACCENT_COLORS } = await import('../../utils/constants');
      const schema = await generateSchemaFromPrompt(prompt.trim(), ctrl.signal);

      const tableIdMap = new Map<string, string>();
      const tables = (schema.tables ?? []).map((t: any, idx: number) => {
        const id = nanoid();
        tableIdMap.set(t.name, id);

        const fields = (t.fields ?? []).map((f: any) => ({
          id: nanoid(),
          name: f.name,
          type: f.type ?? 'text',
          nullable: f.nullable !== false,
          unique: !!f.unique,
          isPK: !!f.isPK,
          isFK: !!f.isFK,
          default: f.default,
        }));

        return {
          id,
          name: t.name,
          fields,
          accentColor: ACCENT_COLORS[idx % ACCENT_COLORS.length],
          position: {
            x: 80 + (idx % 4) * 300,
            y: 80 + Math.floor(idx / 4) * 220,
          },
        };
      });

      const rels = (schema.relationships ?? []).map((r: any) => {
        const srcTable = tables.find((t: any) => t.name === r.from);
        const tgtTable = tables.find((t: any) => t.name === r.to);
        if (!srcTable || !tgtTable) return null;

        const srcField = srcTable.fields.find((f: any) => f.name === r.fromField);
        const tgtField = tgtTable.fields.find((f: any) => f.name === r.toField);
        if (!srcField || !tgtField) return null;

        return {
          id: nanoid(),
          sourceTableId: srcTable.id,
          sourceFieldId: srcField.id,
          targetTableId: tgtTable.id,
          targetFieldId: tgtField.id,
          cardinality: r.cardinality ?? 'one-to-many',
        };
      }).filter(Boolean);

      setPreview(tables.map((t: any) => `${t.name} (${t.fields.length} fields)`));
      setStatus('done');

      importTables(tables, rels);
      setTimeout(() => window.dispatchEvent(new CustomEvent('sf:fit-view')), 150);
    } catch (e: any) {
      if (e.name === 'AbortError') { setStatus('idle'); return; }
      setError(e.message ?? 'Schema generation failed');
      setStatus('error');
    }
  }, [prompt, importTables, addRelationship]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); generate(); }
    if (e.key === 'Escape') onClose();
  };

  const EXAMPLES = [
    'Multi-tenant SaaS with teams, users, roles and audit logs',
    'E-commerce with products, orders, cart and reviews',
    'Blog with posts, comments, tags, authors and subscriptions',
    'Hospital with patients, doctors, appointments and prescriptions',
  ];

  return (
    <div className="ai-gen-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ai-gen-dialog" onKeyDown={handleKeyDown}>
        <div className="ai-gen-header">
          <span className="ai-mark">✦</span>
          <div>
            <div className="ai-gen-title">Generate schema from description</div>
            <div className="ai-gen-subtitle">Describe your app and AI will design the database tables</div>
          </div>
          <button className="ai-gen-close" onClick={onClose}>✕</button>
        </div>

        <div className="ai-gen-body">
          <textarea
            ref={inputRef}
            className="ai-gen-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Multi-tenant SaaS platform with teams, users, roles, projects, tasks and audit logs"
            rows={3}
            disabled={status === 'loading'}
          />

          <div className="ai-gen-examples">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                className="ai-gen-example"
                onClick={() => setPrompt(ex)}
                disabled={status === 'loading'}
              >
                {ex}
              </button>
            ))}
          </div>

          {error && (
            <div className="ai-error">
              <span className="ai-error__icon">⚠</span> {error}
            </div>
          )}

          {status === 'done' && preview.length > 0 && (
            <div className="ai-gen-preview">
              <div className="ai-gen-preview__title">✓ Generated {preview.length} tables</div>
              <div className="ai-gen-preview__list">
                {preview.map((p) => <span key={p} className="ai-gen-preview__tag">{p}</span>)}
              </div>
            </div>
          )}
        </div>

        <div className="ai-gen-footer">
          <span className="ai-gen-hint">⌘↩ to generate</span>
          <button
            className="ai-gen-btn"
            onClick={generate}
            disabled={!prompt.trim() || status === 'loading'}
          >
            {status === 'loading' ? (
              <><span className="ai-spinner" /> Generating…</>
            ) : status === 'done' ? (
              '✓ Applied to canvas'
            ) : (
              '✦ Generate schema'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

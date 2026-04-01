import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSchemaStore } from '../../store/schema';
import { useUIStore } from '../../store/ui';
import './SearchOverlay.css';

interface SearchHit {
  kind: 'table' | 'field';
  tableId: string;
  tableName: string;
  fieldId?: string;
  fieldName?: string;
  fieldType?: string;
  score: number;
}

function scoreMatch(haystack: string, needle: string): number {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (h === n) return 3;
  if (h.startsWith(n)) return 2;
  if (h.includes(n)) return 1;
  return 0;
}

interface SearchOverlayProps {
  onClose: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ onClose }) => {
  const { tables } = useSchemaStore();
  const { setSelection } = useUIStore();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const hits = useMemo<SearchHit[]>(() => {
    if (!query.trim()) {
      // Show all tables when empty
      return tables.map((t) => ({
        kind: 'table' as const,
        tableId: t.id,
        tableName: t.name,
        score: 0,
      })).slice(0, 20);
    }

    const q = query.trim();
    const results: SearchHit[] = [];

    for (const table of tables) {
      const ts = scoreMatch(table.name, q);
      if (ts > 0) {
        results.push({ kind: 'table', tableId: table.id, tableName: table.name, score: ts + 0.5 });
      }

      for (const field of table.fields) {
        const fs = scoreMatch(field.name, q) || scoreMatch(field.type, q);
        if (fs > 0) {
          results.push({
            kind: 'field',
            tableId: table.id,
            tableName: table.name,
            fieldId: field.id,
            fieldName: field.name,
            fieldType: field.type,
            score: fs,
          });
        }
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 30);
  }, [query, tables]);

  useEffect(() => { setActiveIndex(0); }, [hits]);

  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const selectHit = useCallback((hit: SearchHit) => {
    if (hit.kind === 'field' && hit.fieldId) {
      setSelection({ type: 'field', tableId: hit.tableId, fieldId: hit.fieldId });
    } else {
      setSelection({ type: 'table', tableId: hit.tableId });
    }
    // Fire fit-to-node event so canvas pans to it
    window.dispatchEvent(new CustomEvent('sf:focus-table', { detail: hit.tableId }));
    onClose();
  }, [setSelection, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const hit = hits[activeIndex]; if (hit) selectHit(hit); }
    else if (e.key === 'Escape') onClose();
  };

  const highlight = (text: string) => {
    if (!query.trim()) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) return <>{text}</>;
    return <>
      {text.slice(0, idx)}
      <mark className="search-hit__mark">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>;
  };

  return (
    <div
      className="search-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-label="Search schema"
      aria-modal="true"
    >
      <div className="search-dialog" onKeyDown={handleKeyDown}>
        {/* Input */}
        <div className="search-input-wrap">
          <span className="search-icon">◎</span>
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tables and fields…"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear">✕</button>
          )}
          <kbd className="search-esc">esc</kbd>
        </div>

        {/* Results */}
        <div className="search-results" ref={listRef}>
          {hits.length === 0 ? (
            <div className="search-empty">No matches for "{query}"</div>
          ) : (
            hits.map((hit, i) => (
              <button
                key={`${hit.tableId}-${hit.fieldId ?? 'tbl'}`}
                className={`search-result ${i === activeIndex ? 'search-result--active' : ''}`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => selectHit(hit)}
              >
                {hit.kind === 'table' ? (
                  <>
                    <span className="search-result__icon search-result__icon--table">⊞</span>
                    <span className="search-result__label">{highlight(hit.tableName)}</span>
                    <span className="search-result__meta">{tables.find((t) => t.id === hit.tableId)?.fields.length} fields</span>
                  </>
                ) : (
                  <>
                    <span className="search-result__icon search-result__icon--field">·</span>
                    <span className="search-result__parent">{hit.tableName}</span>
                    <span className="search-result__sep">.</span>
                    <span className="search-result__label">{highlight(hit.fieldName ?? '')}</span>
                    <span className="search-result__meta search-result__meta--type">{hit.fieldType}</span>
                  </>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="search-footer">
          <span>↑↓ navigate</span>
          <span>↩ select</span>
          <span>{hits.length} result{hits.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
};

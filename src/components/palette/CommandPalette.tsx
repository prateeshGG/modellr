import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useSchemaStore } from '../../store/schema';
import { useUIStore } from '../../store/ui';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { TEMPLATES } from '../../utils/templates';
import './CommandPalette.css';

type Category = 'All' | 'Actions' | 'Navigate' | 'Insert' | 'Templates' | 'AI';

interface Command {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  category: Exclude<Category, 'All'>;
  icon: string;
  action: () => void;
  disabled?: boolean;
}

export const CommandPalette: React.FC = () => {
  const { paletteOpen, closePalette, setMode, toggleTheme, toggleSidebar, toggleRightPanel, showToast, selection } = useUIStore();
  const { addTable, tables, importTables } = useSchemaStore() as any;
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: Command[] = useMemo(() => [
    // Insert
    {
      id: 'new-table', label: 'New table', shortcut: 'T',
      category: 'Insert', icon: '☐',
      action: () => { addTable({ x: 120 + (tables.length % 4) * 260, y: 120 + Math.floor(tables.length / 4) * 160 }); closePalette(); },
    },
    // Actions
    {
      id: 'ai-gen-schema', label: '✦ Generate schema with AI',
      description: 'Describe your app in plain English and AI generates the tables',
      category: 'AI', icon: '✦',
      action: () => {
        closePalette();
        window.dispatchEvent(new CustomEvent('sf:open-ai-generate'));
      },
    },
    {
      id: 'search', label: 'Search tables & fields',
      description: 'Find any table or field across the schema (Ctrl+F)',
      category: 'Actions', icon: '◎',
      action: () => {
        closePalette();
        window.dispatchEvent(new CustomEvent('sf:open-search'));
      },
    },
    {
      id: 'import-sql', label: 'Import SQL DDL',
      description: 'Paste CREATE TABLE statements to generate schema',
      category: 'Actions', icon: '↓',
      action: () => {
        closePalette();
        window.dispatchEvent(new CustomEvent('sf:open-import', { detail: { type: 'sql' } }));
      },
    },
    {
      id: 'import-prisma', label: 'Import Prisma schema',
      description: 'Paste a .prisma schema file to generate schema',
      category: 'Actions', icon: '↓',
      action: () => {
        closePalette();
        window.dispatchEvent(new CustomEvent('sf:open-import', { detail: { type: 'prisma' } }));
      },
    },
    {
      id: 'open-diff', label: 'Compare with snapshot',
      description: 'View schema diff against a saved snapshot',
      category: 'Actions', icon: '⊕',
      action: () => {
        closePalette();
        window.dispatchEvent(new CustomEvent('sf:open-diff'));
      },
    },
    {
      id: 'share-link', label: 'Copy share link',
      description: 'Encode current schema in a shareable URL',
      category: 'Actions', icon: '⤴',
      action: () => {
        closePalette();
        window.dispatchEvent(new CustomEvent('sf:share'));
      },
    },
    {
      id: 'auto-layout', label: 'Auto-layout schema', shortcut: 'G',
      category: 'Actions', icon: '⊞',
      action: () => { window.dispatchEvent(new CustomEvent('sf:auto-layout')); closePalette(); },
    },
    {
      id: 'fit-view', label: 'Fit canvas to view', shortcut: 'F',
      category: 'Actions', icon: '⤢',
      action: () => { window.dispatchEvent(new CustomEvent('sf:fit-view')); closePalette(); },
    },
    {
      id: 'undo', label: 'Undo', shortcut: '⌘Z',
      category: 'Actions', icon: '↩', disabled: !canUndo,
      action: () => { undo(); closePalette(); },
    },
    {
      id: 'redo', label: 'Redo', shortcut: '⌘Y',
      category: 'Actions', icon: '↪', disabled: !canRedo,
      action: () => { redo(); closePalette(); },
    },
    {
      id: 'clear-schema', label: 'Clear schema',
      description: 'Remove all tables and relationships',
      category: 'Actions', icon: '✕',
      action: () => {
        importTables([], []);
        useUIStore.getState().clearSelection();
        (showToast as any)?.('Schema cleared', 'info');
        closePalette();
      },
    },
    {
      id: 'toggle-sidebar', label: 'Toggle sidebar', shortcut: '⌘B',
      category: 'Actions', icon: '☰',
      action: () => { toggleSidebar(); closePalette(); },
    },
    {
      id: 'toggle-panel', label: 'Toggle right panel', shortcut: '⌘\\',
      category: 'Actions', icon: '▷',
      action: () => { toggleRightPanel(); closePalette(); },
    },
    {
      id: 'toggle-theme', label: 'Toggle light / dark mode',
      category: 'Actions', icon: '◑',
      action: () => { toggleTheme(); closePalette(); },
    },
    // Navigate
    {
      id: 'mode-canvas', label: 'Switch to Canvas mode',
      category: 'Navigate', icon: '⬡',
      action: () => { setMode('canvas'); closePalette(); },
    },
    {
      id: 'mode-split', label: 'Switch to Split mode',
      category: 'Navigate', icon: '⊟',
      action: () => { setMode('split'); closePalette(); },
    },
    {
      id: 'mode-code', label: 'Switch to Code mode',
      category: 'Navigate', icon: '</>',
      action: () => { setMode('code'); closePalette(); },
    },
    // Templates
    ...(Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]).map((key) => ({
      id: `template-${key}`,
      label: `Load ${TEMPLATES[key].label} template`,
      description: TEMPLATES[key].description,
      category: 'Templates' as const,
      icon: '◈',
      action: () => { importTables(TEMPLATES[key].tables, TEMPLATES[key].relationships); closePalette(); },
    })),

    {
      id: 'ai-normalize', label: 'Suggest normalization for selected table',
      category: 'AI', icon: '✦', disabled: selection?.type !== 'table',
      action: () => {
        if (selection?.type === 'table') {
          const table = tables.find((t: any) => t.id === (selection as any).tableId);
          if (table) {
            window.dispatchEvent(new CustomEvent('sf:open-ai-generate', { detail: { initialPrompt: `Analyze and suggest normalizations for the ${table.name} table.` } }));
          }
        }
        closePalette();
      },
    },
  ], [addTable, tables, closePalette, toggleSidebar, toggleRightPanel, toggleTheme, setMode, undo, redo, canUndo, canRedo, importTables, showToast, selection]);

  const filtered = useMemo(() => {
    const cat = activeCategory === 'All' ? commands : commands.filter((c) => c.category === activeCategory);
    if (!query.trim()) return cat;
    const q = query.toLowerCase();
    return cat.filter((c) => c.label.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
  }, [commands, query, activeCategory]);

  useEffect(() => { setActiveIndex(0); }, [filtered]);

  useEffect(() => {
    if (paletteOpen) {
      setQuery('');
      setActiveCategory('All');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [paletteOpen]);

  // Fix #46: scroll highlighted ITEM into view, not just the group wrapper
  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    const items = listEl.querySelectorAll<HTMLElement>('button.palette__item');
    items[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[activeIndex];
      if (cmd && !cmd.disabled) cmd.action();
    } else if (e.key === 'Escape') {
      closePalette();
    }
  };

  if (!paletteOpen) return null;

  const categories: Category[] = ['All', 'Actions', 'Navigate', 'AI', 'Insert', 'Templates'];

  // Group filtered results by category — Fix #27: include Templates
  const grouped = categories.slice(1).reduce((acc, cat) => {
    const items = filtered.filter((c) => c.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {} as Record<string, Command[]>);

  return (
    <div
      className="palette-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) closePalette(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="palette" onKeyDown={handleKeyDown}>
        {/* Search */}
        <div className="palette__search">
          <span className="palette__search-icon">◎</span>
          <input
            ref={inputRef}
            className="palette__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands…"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="palette__esc">esc</kbd>
        </div>

        {/* Category filter */}
        <div className="palette__categories" role="tablist">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`palette__cat-btn ${activeCategory === cat ? 'palette__cat-btn--active' : ''}`}
              onClick={() => setActiveCategory(cat)}
              role="tab"
              aria-selected={activeCategory === cat}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="palette__results" ref={listRef}>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="palette__group">
              <div className="palette__group-label">{cat.toUpperCase()}</div>
              {items.map((cmd) => {
                const globalIndex = filtered.indexOf(cmd);
                return (
                  <button
                    key={cmd.id}
                    className={[
                      'palette__item',
                      globalIndex === activeIndex ? 'palette__item--active' : '',
                      cmd.disabled ? 'palette__item--disabled' : '',
                      cmd.category === 'AI' ? 'palette__item--ai' : '',
                    ].filter(Boolean).join(' ')}
                    onMouseEnter={() => setActiveIndex(globalIndex)}
                    onClick={() => !cmd.disabled && cmd.action()}
                    disabled={cmd.disabled}
                  >
                    <span className="palette__item-icon">{cmd.icon}</span>
                    <span className="palette__item-content">
                      <span className="palette__item-label">{cmd.label}</span>
                      {cmd.description && (
                        <span className="palette__item-desc">{cmd.description}</span>
                      )}
                    </span>
                    {cmd.shortcut && (
                      <kbd className="palette__shortcut">{cmd.shortcut}</kbd>
                    )}
                    {cmd.disabled && (
                      <span className="palette__coming-soon">Phase 2</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="palette__empty">No commands found for "{query}"</div>
          )}
        </div>
      </div>
    </div>
  );
};

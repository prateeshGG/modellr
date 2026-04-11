import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchemaStore } from '../../store/schema';
import { useUIStore } from '../../store/ui';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { DIALECT_LABELS, DIALECTS } from '../../utils/constants';
import { exportSQL } from '../../utils/exporters/sql';
import { exportDBML } from '../../utils/exporters/dbml';
import { exportImage } from '../../utils/exporters/image';
import { exportPrisma } from '../../utils/exporters/prisma';
import { exportDrizzle } from '../../utils/exporters/drizzle';
import { ShareModal } from '../share/ShareModal';
import {
  Search,
  Sparkles,
  Undo2,
  Redo2,
  Menu,
  Home,
  Settings,
  Moon,
  Sun,
  Database,
  GitCompare,
  Download,
  Plus,
  ArrowUpRight
} from 'lucide-react';
import './TopBar.css';

interface TopBarProps {
  isHost?: boolean;
  onImportClick?: () => void;
  onDiffClick?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ isHost = false, onImportClick, onDiffClick }) => {
  const navigate = useNavigate();
  const { projectName, setProjectName, dialect, setDialect, tables, relationships } = useSchemaStore();
  const { mode, setMode, toggleTheme, theme, toggleSidebar, readOnly, openPalette } = useUIStore();
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const [editingName, setEditingName] = useState(false);
  const [localName, setLocalName] = useState(projectName);
  const nameRef = useRef<HTMLInputElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Fix #16: listen for the ⌘⇧E keyboard shortcut event
  useEffect(() => {
    const handler = () => setExportOpen((o) => !o);
    window.addEventListener('sf:toggle-export', handler);
    return () => window.removeEventListener('sf:toggle-export', handler);
  }, []);

  const commitName = () => {
    const trimmed = localName.trim();
    if (trimmed) setProjectName(trimmed);
    else setLocalName(projectName);
    setEditingName(false);
  };

  const handleExport = async (format: string) => {
    setExportOpen(false);
    const { showToast } = useUIStore.getState();
    try {
      if (format === 'sql') {
        const sql = exportSQL(tables, relationships, dialect);
        await navigator.clipboard.writeText(sql);
        showToast('SQL copied to clipboard');
      } else if (format === 'dbml') {
        const dbml = exportDBML(tables, relationships);
        await navigator.clipboard.writeText(dbml);
        showToast('DBML copied to clipboard');
      } else if (format === 'png') {
        await exportImage('png');
        showToast('Canvas exported as PNG');
      } else if (format === 'svg') {
        await exportImage('svg');
        showToast('Canvas exported as SVG');
      } else if (format === 'json') {
        const json = JSON.stringify({ tables, relationships }, null, 2);
        await navigator.clipboard.writeText(json);
        showToast('JSON copied to clipboard');
      } else if (format === 'prisma') {
        const prisma = exportPrisma(tables, relationships);
        await navigator.clipboard.writeText(prisma);
        showToast('Prisma schema copied to clipboard');
      } else if (format === 'drizzle') {
        const drizzle = exportDrizzle(tables, relationships);
        await navigator.clipboard.writeText(drizzle);
        showToast('Drizzle schema copied to clipboard');
      }
    } catch {
      showToast('Export failed', 'error');
    }
  };

  return (
    <header className="topbar" role="banner">
      {/* Left: Sidebar toggle, Home, SF Logo, Undo/Redo, Project Name */}
      <div className="topbar__left">
        <button
          className="topbar__sidebar-toggle"
          onClick={toggleSidebar}
          title="Toggle sidebar (⌘B)"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>
        <button
          className="topbar__btn topbar__btn--icon"
          onClick={() => navigate('/app')}
          title="Back to Dashboard"
          aria-label="Dashboard"
        >
          <Home size={18} />
        </button>

        {/* Undo / Redo */}
        <div className="topbar__undo-redo">
          <button
            className="topbar__btn topbar__btn--icon"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            aria-label="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button
            className="topbar__btn topbar__btn--icon"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (⌘Y)"
            aria-label="Redo"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <div className="topbar__divider topbar__hide-mobile" />
        <div className="topbar__project-info">
          {editingName && isHost ? (
            <input
              ref={nameRef}
              className="topbar__project-name-input"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitName();
                if (e.key === 'Escape') { setLocalName(projectName); setEditingName(false); }
              }}
              autoFocus
            />
          ) : (
            <button
              className="topbar__project-name"
              onClick={() => {
                if (isHost) {
                  setLocalName(projectName);
                  setEditingName(true);
                }
              }}
              title={isHost ? "Click to rename" : "Project Name"}
              style={{ cursor: isHost ? 'text' : 'default' }}
            >
              {projectName}
            </button>
          )}
          {readOnly && (
            <div className="topbar__badge topbar__hide-mobile">
              View Only
            </div>
          )}
        </div>
      </div>

      {/* Center: Search pill, AI trigger, Mode switcher */}
      <div className="topbar__center">
        <button className="topbar__search-trigger" onClick={openPalette}>
          <Search size={14} className="topbar__search-icon" />
          <span className="topbar__search-label">Search commands…</span>
          <kbd className="topbar__search-kbd">⌘K</kbd>
        </button>

        <button
          className="topbar__ai-btn"
          onClick={() => window.dispatchEvent(new CustomEvent('sf:open-ai-generate'))}
          title="Generate schema with AI"
        >
          <Sparkles size={14} />
          <span className="topbar__ai-label">AI</span>
        </button>

        <div className="topbar__divider topbar__hide-compact" />

        <div className="mode-switcher" role="tablist" aria-label="View mode">
          {(['canvas', 'split', 'code'] as const).map((m) => (
            <button
              key={m}
              className={`mode-switcher__btn ${mode === m ? 'mode-switcher__btn--active' : ''}`}
              onClick={() => setMode(m)}
              role="tab"
              aria-selected={mode === m}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Actions, export, theme, settings */}
      <div className="topbar__right">
        {isHost && (
          <div className="dialect-selector topbar__hide-mobile">
            <select
              className="dialect-select"
              value={dialect}
              onChange={(e) => setDialect(e.target.value as any)}
              aria-label="Database dialect"
            >
              {DIALECTS.map((d) => (
                <option key={d} value={d}>{DIALECT_LABELS[d]}</option>
              ))}
            </select>
          </div>
        )}

        <div className="topbar__actions">
          {/* Connect DB button */}
          {isHost && (
            <button
              className="topbar__btn"
              onClick={() => window.dispatchEvent(new CustomEvent('sf:open-live-import'))}
              title="Connect Live Database"
              aria-label="Connect DB"
            >
              <Database size={16} />
              <span className="topbar__btn-label">Connect DB</span>
            </button>
          )}

          {/* Import button */}
          {isHost && (
            <button
              className="topbar__btn"
              onClick={onImportClick}
              title="Import SQL or Prisma"
              aria-label="Import schema"
            >
              <Plus size={16} />
              <span className="topbar__btn-label">Import</span>
            </button>
          )}

          {/* Diff button */}
          {isHost && (
            <button
              className="topbar__btn"
              onClick={onDiffClick}
              title="Compare with snapshot"
              aria-label="Diff viewer"
            >
              <GitCompare size={16} />
              <span className="topbar__btn-label">Diff</span>
            </button>
          )}

          {/* Share button */}
          <button
            className="topbar__btn"
            onClick={() => setShareModalOpen(true)}
            title="Share & Embed Schema"
            aria-label="Share schema"
          >
            <ArrowUpRight size={16} />
            <span className="topbar__btn-label">Share</span>
          </button>

          {/* Export dropdown */}
          <div className="export-dropdown" style={{ position: 'relative' }}>
            <button
              className="topbar__btn"
              onClick={() => setExportOpen((o) => !o)}
              title="Export (⌘⇧E)"
            >
              <Download size={16} />
              <span className="topbar__btn-label">Export</span>
            </button>
            {exportOpen && (
              <div className="export-menu">
                {[
                  { id: 'sql',     label: 'SQL DDL' },
                  { id: 'dbml',    label: 'DBML' },
                  { id: 'prisma',  label: 'Prisma schema' },
                  { id: 'drizzle', label: 'Drizzle ORM' },
                  { id: 'json',    label: 'JSON schema' },
                  { id: 'png',     label: 'PNG image' },
                  { id: 'svg',     label: 'SVG image' },
                ].map((item) => (
                  <button key={item.id} className="export-menu__item" onClick={() => handleExport(item.id)}>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="topbar__divider" />

        <div className="topbar__controls">
          <button
            className="topbar__btn topbar__btn--icon"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            className="topbar__btn topbar__btn--icon"
            onClick={() => navigate('/app/settings')}
            title="Settings"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {shareModalOpen && <ShareModal onClose={() => setShareModalOpen(false)} />}
    </header>
  );
};

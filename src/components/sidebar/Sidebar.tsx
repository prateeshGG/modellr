import React, { useState, useEffect } from 'react';
import { useSchemaStore } from '../../store/schema';
import { useUIStore } from '../../store/ui';
import { useHistoryStore } from '../../store/history';
import { ACCENT_HEX } from '../../utils/constants';
import { TEMPLATES } from '../../utils/templates';
import './Sidebar.css';

interface SidebarProps {
  isHost?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isHost = false }) => {
  const { tables, addTable, importTables } = useSchemaStore();
  const { sidebarOpen, setSelection, readOnly, setSidebarOpen } = useUIStore();
  const { snapshots, createSnapshot, restoreSnapshot } = useHistoryStore();
  const [filter, setFilter] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // Fix #19: handle sf:focus-filter — open sidebar first if it's collapsed,
  // then focus the filter input once the DOM has updated.
  useEffect(() => {
    const handler = () => {
      if (!sidebarOpen) {
        setSidebarOpen(true);
        // Wait one frame for the sidebar to render the input before focusing
        setTimeout(() => {
          document.querySelector<HTMLInputElement>('.sidebar__filter')?.focus();
        }, 50);
      } else {
        document.querySelector<HTMLInputElement>('.sidebar__filter')?.focus();
      }
    };
    window.addEventListener('sf:focus-filter', handler);
    return () => window.removeEventListener('sf:focus-filter', handler);
  }, [sidebarOpen, setSidebarOpen]);

  const filtered = tables.filter((t) =>
    t.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <aside
      className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--collapsed'}`}
      aria-label="Tables sidebar"
    >
      {sidebarOpen ? (
        <>
          {/* Table list header */}
          <div className="sidebar__section-header">
            <span className="sidebar__section-label">TABLES</span>
            {!readOnly && (
              <button
                className="sidebar__icon-btn"
                onClick={() => addTable({ x: 100 + tables.length * 20, y: 100 + tables.length * 20 })}
                title="New table (T)"
                aria-label="Add table"
              >
                +
              </button>
            )}
          </div>

          {/* Filter input */}
          <div className="sidebar__search">
            <input
              type="text"
              placeholder="Filter tables…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="sidebar__filter"
              aria-label="Filter tables"
            />
          </div>

          {/* Table list */}
          <div className="sidebar__table-list">
            {filtered.map((table) => (
              <button
                key={table.id}
                className="sidebar__table-item"
                onClick={() => setSelection({ type: 'table', tableId: table.id })}
              >
                <span
                  className="sidebar__table-dot"
                  style={{ background: ACCENT_HEX[table.accentColor] }}
                />
                <span className="sidebar__table-name">{table.name}</span>
                <span className="sidebar__table-count">{table.fields.length}</span>
              </button>
            ))}
            {filtered.length === 0 && tables.length > 0 && (
              <p className="sidebar__empty-filter">No tables match "{filter}"</p>
            )}
          </div>

          {/* History section */}
          {isHost && (
            <div className="sidebar__collapsible">
              <button
                className="sidebar__collapsible-header"
                onClick={() => setHistoryOpen((o) => !o)}
                aria-expanded={historyOpen}
              >
                <span className="sidebar__section-label">HISTORY</span>
                <span className="sidebar__chevron">{historyOpen ? '▾' : '▸'}</span>
              </button>
              {historyOpen && (
                <div className="sidebar__history">
                  {!readOnly && (
                    <button
                      className="sidebar__history-create"
                      onClick={() => createSnapshot()}
                    >
                      + Save snapshot
                    </button>
                  )}
                  {snapshots.map((snap) => (
                    <button
                      key={snap.id}
                      className="sidebar__snapshot-item"
                      onClick={() => {
                        if (readOnly) return;
                        useUIStore.getState().showDialog({
                          title: 'Restore snapshot?',
                          message: `Replace the current schema with "${snap.label}"? You can undo this with Ctrl/Cmd+Z.`,
                          type: 'confirm',
                          onConfirm: () => restoreSnapshot(snap.id),
                        });
                      }}
                      title={new Date(snap.timestamp).toLocaleString()}
                    >
                      <span className="snapshot-label">{snap.label}</span>
                      <span className="snapshot-time">
                        {new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </button>
                  ))}
                  {snapshots.length === 0 && (
                    <p className="sidebar__empty-filter">No snapshots yet</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Templates section */}
          <div className="sidebar__collapsible">
            <button
              className="sidebar__collapsible-header"
              onClick={() => setTemplatesOpen((o) => !o)}
              aria-expanded={templatesOpen}
            >
              <span className="sidebar__section-label">TEMPLATES</span>
              <span className="sidebar__chevron">{templatesOpen ? '▾' : '▸'}</span>
            </button>
            {templatesOpen && (
              <div className="sidebar__templates">
                {!readOnly ? (
                  (Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]).map((key) => (
                    <button
                      key={key}
                      className="sidebar__template-item"
                      onClick={() => {
                        const t = TEMPLATES[key];
                        importTables(t.tables, t.relationships);
                      }}
                    >
                      {TEMPLATES[key].label}
                    </button>
                  ))
                ) : (
                  <p className="sidebar__empty-filter">Templates disabled in View-Only mode.</p>
                )}
              </div>
            )}
          </div>

          {/* New table footer */}
          {!readOnly && (
            <div className="sidebar__footer">
              <button
                className="sidebar__new-table"
                onClick={() => addTable({ x: 120 + (tables.length % 5) * 260, y: 120 + Math.floor(tables.length / 5) * 180 })}
              >
                + New table
              </button>
            </div>
          )}
        </>
      ) : (
        /* Icon rail when collapsed */
        <div className="sidebar__icon-rail">
          <button className="sidebar__rail-icon" title="Tables" onClick={() => useUIStore.getState().toggleSidebar()}>☰</button>
          {/* Fix #20: only show History rail icon if user is the schema host */}
          {isHost && (
            <button className="sidebar__rail-icon" title="History" onClick={() => { useUIStore.getState().toggleSidebar(); setHistoryOpen(true); }}>⏱</button>
          )}
          <button className="sidebar__rail-icon" title="Templates" onClick={() => { useUIStore.getState().toggleSidebar(); setTemplatesOpen(true); }}>⊞</button>
        </div>
      )}
    </aside>
  );
};

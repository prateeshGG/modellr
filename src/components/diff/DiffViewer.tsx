import React, { useMemo, useState } from 'react';
import { useSchemaStore } from '../../store/schema';
import { useHistoryStore } from '../../store/history';
import { useUIStore } from '../../store/ui';
import type { Table, Field, Relationship } from '../../types/schema';
import CodeMirror from '@uiw/react-codemirror';
import { sql as sqlLang } from '@codemirror/lang-sql';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { generateMigrationsSQL } from '../../utils/exporters/migrations';
import { diffSchemas, diffRelationships } from '../../utils/schemaDiff';
import './DiffViewer.css';

interface DiffViewerProps {
  onClose: () => void;
}

function fieldBadges(f: Field) {
  const badges: string[] = [];
  if (f.isPK) badges.push('PK');
  if (f.isFK) badges.push('FK');
  if (f.unique && !f.isPK) badges.push('UQ');
  if (!f.nullable) badges.push('NN');
  return badges;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ onClose }) => {
  const { tables, relationships, dialect } = useSchemaStore();
  const { snapshots, restoreSnapshot } = useHistoryStore();
  const { showDialog } = useUIStore();
  const [showSql, setShowSql] = useState(false);

  // Fix #22: default to the OLDEST snapshot (last in list) — most useful for comparing past → present
  const [snapshotId, setSnapshotId] = useState<string>(
    snapshots.length > 0 ? snapshots[snapshots.length - 1].id : ''
  );

  const snapshot = snapshots.find((s) => s.id === snapshotId);

  const diffs = useMemo(() => {
    if (!snapshot) return [];
    return diffSchemas(
      { tables: snapshot.tables as Table[] },
      { tables }
    );
  }, [snapshot, tables]);

  const relDiffs = useMemo(() => {
    if (!snapshot) return [];
    return diffRelationships(
      { tables: snapshot.tables as Table[], relationships: snapshot.relationships as Relationship[] },
      { tables, relationships },
    );
  }, [snapshot, tables, relationships]);

  const hasChanges = diffs.length > 0 || relDiffs.length > 0;
  const addedCount   = diffs.filter((d) => d.kind === 'added').length;
  const removedCount = diffs.filter((d) => d.kind === 'removed').length;
  const changedCount = diffs.filter((d) => d.kind === 'changed').length;

  return (
    <div
      className="diff-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Schema diff"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="diff-dialog">
        {/* Header */}
        <div className="diff-dialog__header">
          <div>
            <h2 className="diff-dialog__title">Schema Diff</h2>
            <p className="diff-dialog__sub">
              Compare the current schema against a saved snapshot.
            </p>
          </div>
          <button className="diff-dialog__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Snapshot picker */}
        <div className="diff-dialog__controls">
          <label className="diff-label">Compare with snapshot:</label>
          {snapshots.length === 0 ? (
            <span className="diff-empty-hint">
              No snapshots yet — save one from the History section in the sidebar.
            </span>
          ) : (
            <select
              className="diff-select"
              value={snapshotId}
              onChange={(e) => setSnapshotId(e.target.value)}
            >
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} — {new Date(s.timestamp).toLocaleString()}
                </option>
              ))}
            </select>
          )}

          {snapshot && (
            <div className="diff-summary">
              {addedCount > 0   && <span className="diff-pill diff-pill--added">+{addedCount} added</span>}
              {removedCount > 0 && <span className="diff-pill diff-pill--removed">−{removedCount} removed</span>}
              {changedCount > 0 && <span className="diff-pill diff-pill--changed">~ {changedCount} changed</span>}
              {!hasChanges      && <span className="diff-pill diff-pill--same">✓ No changes</span>}
            </div>
          )}
        </div>

        {/* Diff body */}
        <div className="diff-dialog__body">
          {!snapshot ? (
            <div className="diff-empty">Select a snapshot to compare.</div>
          ) : !hasChanges ? (
            <div className="diff-empty diff-empty--ok">
              <span className="diff-empty__icon">✓</span>
              Current schema is identical to the selected snapshot.
            </div>
          ) : (
            <div className="diff-list">
              {diffs.map((d, i) => {
                if (d.kind === 'added') {
                  return (
                    <div key={i} className="diff-block diff-block--added">
                      <div className="diff-block__header">
                        <span className="diff-badge diff-badge--added">+ TABLE</span>
                        <span className="diff-block__name">{d.table.name}</span>
                        <span className="diff-block__meta">{d.table.fields.length} fields</span>
                      </div>
                      <div className="diff-fields">
                        {d.table.fields.map((f) => (
                          <div key={f.id} className="diff-field diff-field--added">
                            <span className="diff-field__name">{f.name}</span>
                            <span className="diff-field__type">{f.type}</span>
                            <span className="diff-field__badges">
                              {fieldBadges(f).map((b) => <span key={b} className="diff-badge-sm">{b}</span>)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (d.kind === 'removed') {
                  return (
                    <div key={i} className="diff-block diff-block--removed">
                      <div className="diff-block__header">
                        <span className="diff-badge diff-badge--removed">− TABLE</span>
                        <span className="diff-block__name">{d.table.name}</span>
                      </div>
                    </div>
                  );
                }

                // changed
                return (
                  <div key={i} className="diff-block diff-block--changed">
                    <div className="diff-block__header">
                      <span className="diff-badge diff-badge--changed">~ TABLE</span>
                      <span className="diff-block__name">{d.tableName}</span>
                    </div>
                    <div className="diff-fields">
                      {d.fields.map((fd, j) => {
                        if (fd.kind === 'added') return (
                          <div key={j} className="diff-field diff-field--added">
                            <span className="diff-field__marker">+</span>
                            <span className="diff-field__name">{fd.field.name}</span>
                            <span className="diff-field__type">{fd.field.type}</span>
                          </div>
                        );
                        if (fd.kind === 'removed') return (
                          <div key={j} className="diff-field diff-field--removed">
                            <span className="diff-field__marker">−</span>
                            <span className="diff-field__name">{fd.field.name}</span>
                            <span className="diff-field__type">{fd.field.type}</span>
                          </div>
                        );
                        return (
                          <div key={j} className="diff-field diff-field--changed">
                            <span className="diff-field__marker">~</span>
                            <span className="diff-field__name">{fd.before.name}</span>
                            <span className="diff-field__before">{fd.before.type}</span>
                            <span className="diff-field__arrow">→</span>
                            <span className="diff-field__after">{fd.after.type}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SQL Panel */}
        {showSql && snapshot && hasChanges && (
          <div className="diff-dialog__sql-panel">
            <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#94a3b8' }}>Generated SQL Migration</h3>
            <div className="code-mirror-wrapper" style={{ height: '200px', border: '1px solid #334155', borderRadius: '4px', overflow: 'hidden' }}>
              <CodeMirror
                value={generateMigrationsSQL(diffs, dialect, relDiffs)}
                height="100%"
                extensions={[sqlLang()]}
                theme={vscodeDark}
                editable={false}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="diff-dialog__footer">
          {snapshot && hasChanges && (
            <button
              className="diff-dialog__restore-btn"
              onClick={() => setShowSql(!showSql)}
              style={{ backgroundColor: '#1e293b', border: '1px solid #334155', marginRight: '8px' }}
            >
              {showSql ? 'Hide SQL' : 'Generate SQL Migration'}
            </button>
          )}
          {snapshot && (
            <button
              className="diff-dialog__restore-btn"
              onClick={() => {
                // Fix #23: confirm before overwriting the live canvas
                showDialog({
                  title: 'Restore snapshot?',
                  message: `This will replace the current canvas with "${snapshot.label}". Any unsaved changes will be lost.`,
                  type: 'confirm',
                  onConfirm: () => { restoreSnapshot(snapshotId); onClose(); },
                });
              }}
            >
              ↩ Restore this snapshot
            </button>
          )}
          <button className="diff-dialog__close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

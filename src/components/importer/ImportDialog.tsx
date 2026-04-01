import React, { useState, useRef, useCallback } from 'react';
import { useSchemaStore } from '../../store/schema';
import { useUIStore } from '../../store/ui';
import { importSQL } from '../../utils/importers/sql';
import { importPrisma } from '../../utils/importers/prisma';
import './ImportDialog.css';

type ImportFormat = 'sql' | 'prisma';

interface ImportDialogProps {
  onClose: () => void;
  defaultFormat?: ImportFormat;
}

const PLACEHOLDERS: Record<ImportFormat, string> = {
  sql: `-- Paste your SQL DDL here, e.g.:

CREATE TABLE users (
  id bigserial PRIMARY KEY,
  email varchar NOT NULL UNIQUE,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE posts (
  id bigserial PRIMARY KEY,
  author_id bigint NOT NULL REFERENCES users(id),
  title text NOT NULL,
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);`,
  prisma: `// Paste your Prisma schema here, e.g.:

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  posts     Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  authorId  Int
  title     String
  body      String?
  author    User     @relation(fields: [authorId], references: [id])
}`,
};

const FORMAT_LABELS: Record<ImportFormat, string> = {
  sql: 'SQL DDL',
  prisma: 'Prisma Schema',
};

export const ImportDialog: React.FC<ImportDialogProps> = ({ onClose, defaultFormat = 'sql' }) => {
  const [format, setFormat] = useState<ImportFormat>(defaultFormat);
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [imported, setImported] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { importTables } = useSchemaStore();
  const { showToast } = useUIStore() as any;

  const handleImport = useCallback(() => {
    const result = format === 'sql'
      ? importSQL(text)
      : importPrisma(text);

    if (result.errors.length > 0 && result.tables.length === 0) {
      setErrors(result.errors);
      return;
    }

    importTables(result.tables, result.relationships);
    setImported(true);
    (showToast as any)?.(`Imported ${result.tables.length} table${result.tables.length !== 1 ? 's' : ''}`, 'success');
    setTimeout(() => onClose(), 800);
  }, [text, format, importTables, showToast, onClose]);

  const handlePaste = useCallback(async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      setText(clipText);
      setErrors([]);
      setTimeout(() => textareaRef.current?.focus(), 50);
    } catch { /* no clipboard permission */ }
  }, []);

  const handleFormatChange = (f: ImportFormat) => {
    setFormat(f);
    setText('');
    setErrors([]);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleImport(); }
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  return (
    <div
      className="import-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Import schema"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="import-dialog" onKeyDown={handleKeyDown}>
        {/* Header */}
        <div className="import-dialog__header">
          <div>
            <h2 className="import-dialog__title">Import Schema</h2>
            <p className="import-dialog__sub">
              Paste SQL DDL or a Prisma schema — tables, fields, and relationships are imported automatically.
            </p>
          </div>
          <button className="import-dialog__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Format tabs */}
        <div className="import-dialog__format-tabs">
          {(['sql', 'prisma'] as ImportFormat[]).map((f) => (
            <button
              key={f}
              className={`import-dialog__format-tab ${format === f ? 'import-dialog__format-tab--active' : ''}`}
              onClick={() => handleFormatChange(f)}
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="import-dialog__editor-wrap">
          <div className="import-dialog__editor-toolbar">
            <span className="import-dialog__editor-label">{FORMAT_LABELS[format]}</span>
            <div className="import-dialog__editor-actions">
              <button className="import-dialog__pill-btn" onClick={handlePaste}>
                ⌘V Paste from clipboard
              </button>
              <button className="import-dialog__pill-btn" onClick={() => { setText(''); setErrors([]); }}>
                Clear
              </button>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            className="import-dialog__textarea"
            value={text}
            onChange={(e) => { setText(e.target.value); setErrors([]); }}
            placeholder={PLACEHOLDERS[format]}
            spellCheck={false}
            autoFocus
            rows={16}
          />
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="import-dialog__errors" role="alert">
            {errors.map((err, i) => (
              <div key={i} className="import-error">⚠ {err}</div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="import-dialog__footer">
          <div className="import-dialog__supported">
            {format === 'sql'
              ? 'Supported: PostgreSQL · MySQL · SQLite · SQL Server'
              : 'Supported: Prisma Schema Language (PSL)'}
          </div>
          <div className="import-dialog__footer-actions">
            <button className="import-dialog__cancel-btn" onClick={onClose}>Cancel</button>
            <button
              className={`import-dialog__import-btn ${imported ? 'import-dialog__import-btn--done' : ''}`}
              onClick={handleImport}
              disabled={!text.trim() || imported}
            >
              {imported ? '✓ Imported!' : 'Import schema ⌘↩'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useSchemaStore } from '../../store/schema';
import { useUIStore } from '../../store/ui';
import { authFetch } from '../../lib/api-utils';
import './LiveImportDialog.css';

interface LiveImportDialogProps {
  onClose: () => void;
}

export const LiveImportDialog: React.FC<LiveImportDialogProps> = ({ onClose }) => {
  const [url, setUrl] = useState('');
  const [dialect, setDialect] = useState<'postgres' | 'mysql'>('postgres');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Fix #26: track AbortController so we can cancel in-flight requests when dialog closes
  const abortRef = useRef<AbortController | null>(null);

  const { importTables } = useSchemaStore();
  const { showToast } = useUIStore();

  // Focus input on mount & close on Escape; cancel any pending fetch on unmount
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      // Fix #26: abort the fetch if the dialog is closed while introspecting
      abortRef.current?.abort();
    };
  }, [onClose]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);

    // Fix #26: create a new AbortController for this request
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await authFetch(`/api/introspect/${dialect}`, {
        method: 'POST',
        body: JSON.stringify({ connectionString: url.trim() }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `Server error ${res.status}`);
      }

      const data = await res.json();

      if (!data.tables || data.tables.length === 0) {
        throw new Error('No tables found in this database schema.');
      }

      importTables(data.tables, data.relationships || []);
      showToast(`Imported ${data.tables.length} tables from ${dialect === 'postgres' ? 'PostgreSQL' : 'MySQL'}`, 'success');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to connect to database');
    } finally {
      setLoading(false);
    }
  };

  const placeholders: Record<typeof dialect, string> = {
    postgres: 'postgresql://user:password@localhost:5432/dbname',
    mysql: 'mysql://user:password@localhost:3306/dbname',
  };

  return (
    <div className="live-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Connect to live database">
      <div className="live-dialog" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="live-dialog__header">
          <div className="live-dialog__icon-wrap">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="1.8" fill="none">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
            </svg>
          </div>
          <div>
            <h2 className="live-dialog__title">Connect live database</h2>
            <p className="live-dialog__sub">
              Introspect an existing database and render its full schema on the canvas instantly. Your connection string is never stored.
            </p>
          </div>
          <button className="live-dialog__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Dialect tabs */}
        <div className="live-dialog__tabs">
          <button
            type="button"
            className={`live-dialog__tab ${dialect === 'postgres' ? 'live-dialog__tab--active' : ''}`}
            onClick={() => setDialect('postgres')}
            aria-pressed={dialect === 'postgres'}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            PostgreSQL
          </button>
          <button
            type="button"
            className={`live-dialog__tab ${dialect === 'mysql' ? 'live-dialog__tab--active' : ''}`}
            onClick={() => setDialect('mysql')}
            aria-pressed={dialect === 'mysql'}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            MySQL
          </button>
        </div>

        {/* Body */}
        <form className="live-dialog__body" onSubmit={handleImport}>
          <div className="live-dialog__field">
            <label className="live-dialog__label" htmlFor="live-conn-string">
              Connection string
            </label>
            <div className="live-dialog__input-wrap">
              <svg className="live-dialog__input-icon" viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                id="live-conn-string"
                ref={inputRef}
                type="password"
                className="live-dialog__input"
                placeholder={placeholders[dialect]}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <p className="live-dialog__hint">
              {dialect === 'postgres'
                ? 'Format: postgresql://user:password@host:port/database'
                : 'Format: mysql://user:password@host:port/database'}
            </p>
          </div>

          {error && (
            <div className="live-dialog__error" role="alert">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="live-dialog__footer">
            <div className="live-dialog__security-note">
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Credentials are never logged or persisted
            </div>
            <div className="live-dialog__actions">
              <button type="button" className="live-dialog__cancel" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="live-dialog__connect" disabled={loading || !url.trim()}>
                {loading ? (
                  <>
                    <span className="live-dialog__spinner" />
                    Introspecting…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Connect & import
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

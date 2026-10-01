import { useEffect, useState } from 'react';
import { useSeo } from '../lib/seo';
import { useSchemaStore } from '../store/schema';
import { useUIStore } from '../store/ui';
import { SchemaCanvas } from '../components/canvas/SchemaCanvas';
import { decodeShareHash } from '../hooks/useShareLink';

/**
 * Stateless, read-only embed. The schema travels in the URL hash:
 *   <iframe src="https://<host>/embed#/schema/<data>">
 */
export default function EmbedViewer() {
  useSeo({ title: 'Embedded schema', noindex: true });
  // Decoded once; the hash never changes inside an embed.
  const [data] = useState(() => decodeShareHash(window.location.hash));

  useEffect(() => {
    if (!data) return;
    const store = useSchemaStore.getState();
    store.importTables(data.tables, data.relationships, data.notes, data.groups);
    if (data.projectName) store.setProjectName(data.projectName);
    useSchemaStore.temporal.getState().clear();
    useUIStore.getState().setReadOnly(true);
    return () => useUIStore.getState().setReadOnly(false);
  }, [data]);

  if (!data) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--canvas-bg)', color: 'var(--danger-text)', textAlign: 'center', padding: '20px' }}>
        <div>
          <h2>Can't show this schema</h2>
          <p>This embed link is missing or damaged.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--canvas-bg)', position: 'relative' }}>
      <SchemaCanvas />
      <a
        href={window.location.origin}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          background: 'var(--surface-base)',
          border: '1px solid var(--border-subtle)',
          padding: '6px 12px',
          borderRadius: '8px',
          color: 'var(--text-primary)',
          textDecoration: 'none',
          fontSize: '12px',
          fontWeight: 600,
          zIndex: 1000,
        }}
      >
        Made with Modellr
      </a>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSchemaStore } from '../store/schema';
import { useUIStore } from '../store/ui';
import { SchemaCanvas } from '../components/canvas/SchemaCanvas';

export default function EmbedViewer() {
  const { id } = useParams();
  const { importTables, setProjectName } = useSchemaStore();
  const { setReadOnly } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Put the UI store into read-only mode so SchemaCanvas components respect it
    setReadOnly(true);

    async function fetchSchema() {
      if (!id) {
        setError("Invalid schema ID");
        setLoading(false);
        return;
      }

      // Try fetching the schema. Our RLS policy allows selects if is_public = true.
      const { data, error: sbError } = await supabase
        .from('schemas')
        .select('name, canvas_state, is_public')
        .eq('id', id)
        .single();

      if (sbError || !data || !data.is_public) {
        setError("This schema is either private, does not exist, or you lack permission to view it.");
        setLoading(false);
        return;
      }

      setProjectName(data.name);

      if (data.canvas_state) {
        const state = typeof data.canvas_state === 'string' ? JSON.parse(data.canvas_state) : data.canvas_state;
        if (state && Array.isArray(state.tables)) {
          // Fix #5: pass notes and groups so they appear in embedded view
          importTables(
            state.tables,
            state.relationships || [],
            Array.isArray(state.notes) ? state.notes : [],
            Array.isArray(state.groups) ? state.groups : []
          );
        }
      }

      setLoading(false);
    }

    fetchSchema();

    // Cleanup: Reset readOnly if unmounted (though unlikely in embed)
    return () => setReadOnly(false);
  }, [id, importTables, setProjectName, setReadOnly]);

  if (loading) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--canvas-bg)', color: 'var(--text-primary)' }}>
        Loading schema...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--canvas-bg)', color: 'var(--alert-error)', textAlign: 'center', padding: '20px' }}>
        <div>
          <h2>Access Denied</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--canvas-bg)', position: 'relative' }}>
      <SchemaCanvas />
      {/* Branding overlay for viral growth! */}
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
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: 1000
        }}
      >
        <div style={{ width: '16px', height: '16px', background: 'var(--brand)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '8px' }}>SF</div>
        Powered by Modellr
      </a>
    </div>
  );
}

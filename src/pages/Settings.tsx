import { useRef, useState } from 'react';
import { useUIStore } from '../store/ui';
import { openAISettings, useAIConfigured, clearAIConfig } from '../lib/aiConfig';
import { exportAllProjectsJson, importProjectsJson, listProjects, deleteProject, storageMode } from '../lib/projectStore';
import './Dashboard.css';

const section: React.CSSProperties = {
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  padding: 24,
  marginBottom: 24,
  background: 'var(--surface-base)',
};

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function Settings() {
  const showToast = useUIStore((s) => s.showToast);
  const showDialog = useUIStore((s) => s.showDialog);
  const aiConfigured = useAIConfigured();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const backup = async () => {
    download(`modellr-backup-${new Date().toISOString().slice(0, 10)}.json`, await exportAllProjectsJson());
  };

  const restore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const n = await importProjectsJson(await file.text());
      showToast(`Imported ${n} schema${n === 1 ? '' : 's'}`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Import failed', 'error');
    }
  };

  const wipe = () => {
    showDialog({
      title: 'Delete all data',
      message: 'This permanently deletes every schema stored in this browser. Make a backup first if you need one.',
      type: 'confirm',
      onConfirm: async () => {
        setBusy(true);
        try {
          for (const p of await listProjects()) await deleteProject(p.id);
          showToast('All schemas deleted', 'success');
        } finally {
          setBusy(false);
        }
      },
    });
  };

  return (
    <main className="dashboard-main" style={{ maxWidth: 760 }}>
      <div className="dashboard-header">
        <div>
          <h1>Settings</h1>
          <p className="dashboard-description">Everything here is stored in this browser only.</p>
        </div>
      </div>

      <section style={section}>
        <h2 style={{ marginTop: 0 }}>AI assistant (bring your own key)</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
          AI features are optional. They call the AI provider you choose directly from your browser, so your key and your
          schema never pass through any server of ours. Works with OpenAI-compatible endpoints, including free local
          models such as Ollama.
        </p>
        <p style={{ fontSize: 14 }}>
          Status: <b style={{ color: aiConfigured ? 'var(--alert-success)' : 'var(--text-muted)' }}>{aiConfigured ? 'Configured' : 'Not configured'}</b>
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-primary" onClick={openAISettings}>{aiConfigured ? 'Edit AI settings' : 'Set up AI'}</button>
          {aiConfigured && (
            <button className="action-btn" onClick={() => { clearAIConfig(); showToast('AI settings removed from this browser', 'success'); }}>
              Remove key
            </button>
          )}
        </div>
      </section>

      <section style={section}>
        <h2 style={{ marginTop: 0 }}>Your data</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
          Schemas are saved in your browser's IndexedDB{storageMode() === 'memory' ? ' (currently unavailable: your browser is blocking it, so work is not being saved)' : ''}.
          Clearing site data deletes them, so keep a backup of anything important.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="action-btn" onClick={backup}>Download backup</button>
          <button className="action-btn" onClick={() => fileRef.current?.click()}>Restore from file</button>
          <button className="action-btn action-btn--danger" onClick={wipe} disabled={busy}>Delete all data</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={restore} />
      </section>

      <section style={section}>
        <h2 style={{ marginTop: 0 }}>About</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Modellr is free, open-source software (MIT license). Source code, issues and contributions:{' '}
          <a href="https://github.com/prateesh7777/schemaforge" target="_blank" rel="noopener noreferrer">github.com/prateesh7777/schemaforge</a>.
        </p>
      </section>
    </main>
  );
}

import { useRef, useState } from 'react';
import { useUIStore } from '../store/ui';
import { useSeo } from '../lib/seo';
import { openAISettings, useAIConfigured, clearAIConfig } from '../lib/aiConfig';
import { exportAllProjectsJson, importProjectsJson, listProjects, deleteProject, storageMode } from '../lib/projectStore';
import { DONATE_URL, REPO_URL } from '../config';
import { SupportLink } from '../components/shared/SupportLink';

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function Settings() {
  useSeo({ title: 'Settings', noindex: true });
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
    <>
      <div className="n-main__head">
        <div>
          <span className="n-eyebrow">Settings</span>
          <h1 className="n-h2" style={{ marginTop: 10 }}>Your settings</h1>
          <p className="n-small" style={{ marginTop: 6 }}>Everything here is stored in this browser only.</p>
        </div>
      </div>

      <div className="n-cards-fit">
        <section className="n-card" aria-labelledby="set-ai">
          <span className="n-card__meta">AI · optional</span>
          <h2 id="set-ai" className="n-h3">Assistant with your own key</h2>
          <p className="n-small">AI features call the provider you choose directly from your browser, so your key and your schema never pass through any server of ours. Works with OpenAI-compatible endpoints, including free local models such as Ollama.</p>
          <p style={{ margin: '6px 0' }}><span className={`n-badge ${aiConfigured ? 'n-badge--ok' : 'n-badge--fk'}`}>{aiConfigured ? 'Configured' : 'Not configured'}</span></p>
          <div className="n-row">
            <button type="button" className="n-btn" onClick={openAISettings}>{aiConfigured ? 'Edit AI settings' : 'Set up AI'}</button>
            {aiConfigured && (
              <button type="button" className="n-btn n-btn--secondary" onClick={() => { clearAIConfig(); showToast('AI settings removed from this browser', 'success'); }}>Remove key</button>
            )}
          </div>
        </section>

        <section className="n-card" aria-labelledby="set-data">
          <span className="n-card__meta">Data</span>
          <h2 id="set-data" className="n-h3">Your data</h2>
          <p className="n-small">
            Schemas are saved in your browser's IndexedDB{storageMode() === 'memory' ? ' (currently unavailable: your browser is blocking it, so work is not being saved)' : ''}. Clearing site data deletes them, so keep a backup of anything important.
          </p>
          <div className="n-row" style={{ marginTop: 6 }}>
            <button type="button" className="n-btn n-btn--secondary" onClick={backup}>Download backup</button>
            <button type="button" className="n-btn n-btn--secondary" onClick={() => fileRef.current?.click()}>Restore from file</button>
            <button type="button" className="n-btn n-btn--danger" onClick={wipe} disabled={busy}>Delete all data</button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={restore} aria-label="Restore from a backup file" />
        </section>

        <section className="n-card" aria-labelledby="set-about">
          <span className="n-card__meta">About</span>
          <h2 id="set-about" className="n-h3">Modellr</h2>
          <p className="n-small">Free, open-source software (MIT license). Source code, issues and contributions:</p>
          <a className="n-arrow" style={{ alignSelf: 'flex-start' }} href={REPO_URL} target="_blank" rel="noopener noreferrer">{REPO_URL.replace('https://', '')}</a>
          {DONATE_URL && (
            <p className="n-small">No ads and no paid plan. If it saved you time you can <SupportLink className="n-link">buy the author a coffee</SupportLink>; it unlocks nothing.</p>
          )}
        </section>
      </div>
    </>
  );
}

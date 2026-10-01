import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AI_PRESETS,
  getAIConfig,
  saveAIConfig,
  clearAIConfig,
  presetForBaseUrl,
  normalizeBaseUrl,
  isLocalEndpoint,
  validateAIConfig,
  useAIDialogStore,
  type AIConfig,
} from '../../lib/aiConfig';
import { testConnection } from '../../lib/aiClient';
import './AISettingsDialog.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

type TestState =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'ok'; ms: number }
  | { kind: 'error'; message: string };

export const AISettingsDialog: React.FC<Props> = ({ open, onClose }) => {
  const [cfg, setCfg] = useState<AIConfig>(() => getAIConfig());
  const [presetId, setPresetId] = useState<string>(() => presetForBaseUrl(getAIConfig().baseUrl).id);
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState<TestState>({ kind: 'idle' });
  const [formError, setFormError] = useState('');
  const testAbort = useRef<AbortController | null>(null);
  const firstField = useRef<HTMLInputElement>(null);

  // Reload saved values each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    const saved = getAIConfig();
    setCfg(saved);
    setPresetId(presetForBaseUrl(saved.baseUrl).id);
    setShowKey(false);
    setTest({ kind: 'idle' });
    setFormError('');
    const t = setTimeout(() => firstField.current?.focus(), 0);
    return () => { clearTimeout(t); testAbort.current?.abort(); };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const preset = AI_PRESETS.find((p) => p.id === presetId) ?? AI_PRESETS[AI_PRESETS.length - 1];
  const local = isLocalEndpoint(cfg.baseUrl);
  const insecureRemote = /^http:\/\//i.test(cfg.baseUrl.trim()) && !local;

  const update = (patch: Partial<AIConfig>) => {
    setCfg((c) => ({ ...c, ...patch }));
    setTest({ kind: 'idle' });
    setFormError('');
  };

  const choosePreset = (id: string) => {
    setPresetId(id);
    const p = AI_PRESETS.find((x) => x.id === id);
    if (p && p.id !== 'custom') update({ baseUrl: p.baseUrl, model: p.model });
    else update({});
  };

  const candidate = (): AIConfig => ({ ...cfg, baseUrl: normalizeBaseUrl(cfg.baseUrl), apiKey: cfg.apiKey.trim(), model: cfg.model.trim() });

  const runTest = async () => {
    const c = candidate();
    const problem = validateAIConfig(c);
    if (problem) { setFormError(problem); return; }
    testAbort.current?.abort();
    const ctrl = new AbortController();
    testAbort.current = ctrl;
    setTest({ kind: 'testing' });
    const r = await testConnection(c, ctrl.signal);
    if (ctrl.signal.aborted) return;
    setTest(r.ok ? { kind: 'ok', ms: r.ms } : { kind: 'error', message: r.message });
  };

  const save = () => {
    const c = candidate();
    const problem = validateAIConfig(c);
    if (problem) { setFormError(problem); return; }
    saveAIConfig(c);
    onClose();
  };

  const removeSaved = () => {
    clearAIConfig();
    const d = getAIConfig();
    setCfg(d);
    setPresetId(presetForBaseUrl(d.baseUrl).id);
    setTest({ kind: 'idle' });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') { e.preventDefault(); save(); }
  };

  // Portal to <body>: the dialog may be opened from inside a transformed/overflow-hidden container (the drawer).
  return createPortal(
    <div className="ai-set-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ai-set-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-set-title" onKeyDown={onKeyDown}>
        <div className="ai-set-header">
          <div>
            <div id="ai-set-title" className="ai-set-title">AI settings (bring your own key)</div>
            <div className="ai-set-subtitle">Modellr talks directly from your browser to the AI provider you choose.</div>
          </div>
          <button className="ai-set-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="ai-set-body">
          <div className="ai-set-presets" role="radiogroup" aria-label="Provider">
            {AI_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={presetId === p.id}
                className={`ai-set-preset ${presetId === p.id ? 'is-active' : ''}`}
                onClick={() => choosePreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="ai-set-hint">{preset.hint}</p>

          <label className="ai-set-label" htmlFor="ai-set-url">Base URL</label>
          <input
            id="ai-set-url"
            ref={firstField}
            className="ai-set-input"
            value={cfg.baseUrl}
            onChange={(e) => { update({ baseUrl: e.target.value }); setPresetId(presetForBaseUrl(e.target.value).id); }}
            placeholder="https://api.openai.com/v1"
            spellCheck={false}
            autoComplete="off"
          />

          <label className="ai-set-label" htmlFor="ai-set-key">
            API key {local ? <span className="ai-set-optional">(optional for local endpoints)</span> : null}
          </label>
          <div className="ai-set-keyrow">
            <input
              id="ai-set-key"
              className="ai-set-input"
              type={showKey ? 'text' : 'password'}
              value={cfg.apiKey}
              onChange={(e) => update({ apiKey: e.target.value })}
              placeholder={local ? 'Not needed for local models' : 'sk-...'}
              spellCheck={false}
              autoComplete="off"
            />
            <button type="button" className="ai-set-ghost" onClick={() => setShowKey((s) => !s)}>
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="ai-set-note">
            Your key is stored only in this browser (localStorage) and is sent only to the Base URL above.
            It never goes to Modellr servers. Anyone with access to this browser profile can read it.
          </p>
          {insecureRemote && (
            <p className="ai-set-warn">This URL uses plain http:// — your key would be sent unencrypted. Prefer https://.</p>
          )}

          <label className="ai-set-label" htmlFor="ai-set-model">Model</label>
          <input
            id="ai-set-model"
            className="ai-set-input"
            value={cfg.model}
            onChange={(e) => update({ model: e.target.value })}
            placeholder="gpt-4o-mini"
            spellCheck={false}
            autoComplete="off"
          />

          {formError && <div className="ai-set-status ai-set-status--error" role="alert">{formError}</div>}
          {test.kind === 'testing' && <div className="ai-set-status">Testing connection…</div>}
          {test.kind === 'ok' && <div className="ai-set-status ai-set-status--ok" role="status">Connected ({test.ms} ms). Ready to save.</div>}
          {test.kind === 'error' && <div className="ai-set-status ai-set-status--error" role="alert">{test.message}</div>}
        </div>

        <div className="ai-set-footer">
          <button type="button" className="ai-set-link" onClick={removeSaved}>Remove saved settings</button>
          <div className="ai-set-actions">
            <button type="button" className="ai-set-secondary" onClick={runTest} disabled={test.kind === 'testing'}>
              Test connection
            </button>
            <button type="button" className="ai-set-primary" onClick={save}>Save</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

/**
 * Global host: mount `<AISettingsHost />` ONCE (e.g. in App) so any component can open the
 * dialog with `useAIDialogStore.getState().open()` / `openAISettings()`.
 */
export const AISettingsHost: React.FC = () => {
  const isOpen = useAIDialogStore((s) => s.isOpen);
  const close = useAIDialogStore((s) => s.close);
  return <AISettingsDialog open={isOpen} onClose={close} />;
};

export default AISettingsDialog;

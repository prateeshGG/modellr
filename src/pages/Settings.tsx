import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../store/ui';

const D = {
  bg:        '#050507',
  surface:   '#0c0c10',
  surfaceHi: '#13131a',
  border:    '#1e1e2e',
  borderHi:  '#2e2e4e',
  brand:     '#ae7aff',
  brandGlow: 'rgba(174,122,255,0.15)',
  accent:    '#00e5a0',
  text:      '#e8e8f0',
  muted:     '#6b6b80',
  red:       '#f87171',
  green:     '#4ade80',
  mono:      "'Geist Mono', monospace",
  display:   "'Syne', 'Geist', sans-serif",
  body:      "'Instrument Sans', 'Geist', sans-serif",
} as const;

export function Settings() {
  const { session } = useAuthStore();
  const setToast   = useUIStore((s) => s.showToast);
  const showDialog = useUIStore((s) => s.showDialog);

  const [activeTab, setActiveTab] = useState<'profile' | 'api'>('profile');
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('My Secret Key');

  useEffect(() => {
    if (session?.user?.user_metadata?.display_name) {
      setDisplayName(session.user.user_metadata.display_name);
    }
  }, [session]);

  const handleSaveProfile = async () => {
    if (!session?.user) return;
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { display_name: displayName } });
    setIsSaving(false);
    if (error) setToast('Failed to update profile: ' + error.message, 'error');
    else setToast('Profile updated successfully!', 'success');
  };

  const fetchApiKeys = async () => {
    setLoadingKeys(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${baseUrl}/api/keys`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApiKeys(data);
    } catch (err: any) {
      setToast('Failed to load API keys: ' + (err?.message || 'Unknown error'), 'error');
    } finally {
      setLoadingKeys(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'api' && session?.access_token) fetchApiKeys();
  }, [activeTab, session?.access_token]);

  const handleGenerateKey = async () => {
    if (!newKeyLabel.trim()) { setToast('Please provide a name for your key.', 'error'); return; }
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${baseUrl}/api/keys/generate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newKeyLabel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewlyGeneratedKey(data.rawKey);
      setIsCopied(false);
      setApiKeys([data.newKey, ...apiKeys]);
      setNewKeyLabel('My Secret Key');
    } catch (err: any) {
      setToast('Failed to generate key: ' + err.message, 'error');
    }
  };

  const handleCopyKey = async () => {
    if (!newlyGeneratedKey) return;
    await navigator.clipboard.writeText(newlyGeneratedKey);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleDeleteKey = (id: string) => {
    showDialog({
      title: 'Delete API Key',
      message: 'Are you sure? Any MCP server using this key will immediately lose access.',
      type: 'confirm',
      onConfirm: async () => {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
          const res = await fetch(`${baseUrl}/api/keys/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${session?.access_token}` },
          });
          if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
          setApiKeys(prev => prev.filter(k => k.id !== id));
        } catch (err: any) {
          setToast('Failed to delete key: ' + err.message, 'error');
        }
      },
    });
  };

  /* ── Shared styles ── */
  const tabStyle = (t: 'profile' | 'api') => ({
    padding: '9px 14px',
    borderRadius: '5px',
    background: activeTab === t ? D.surfaceHi : 'transparent',
    color: activeTab === t ? D.text : D.muted,
    fontWeight: activeTab === t ? 600 : 400,
    cursor: 'pointer',
    fontSize: '13px',
    border: `1px solid ${activeTab === t ? D.border : 'transparent'}`,
    fontFamily: D.body,
    transition: 'all 0.15s',
  } as React.CSSProperties);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: D.surface,
    border: `1px solid ${D.border}`,
    borderRadius: '4px',
    padding: '10px 12px',
    color: D.text,
    fontSize: '13px',
    outline: 'none',
    fontFamily: D.body,
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: D.mono,
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: D.muted,
    marginBottom: '7px',
    textTransform: 'uppercase',
  };

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100%', color: D.text, background: D.bg }}>
      <main style={{ maxWidth: '960px', margin: '0 auto', width: '100%', padding: '48px 32px', flex: 1, display: 'flex', gap: '40px', boxSizing: 'border-box' }}>

        {/* ── Sidebar nav ── */}
        <aside style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontFamily: D.mono, fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: D.muted, textTransform: 'uppercase', padding: '0 14px', marginBottom: '10px' }}>
            Settings
          </div>
          <div onClick={() => { setActiveTab('profile'); setNewlyGeneratedKey(null); }} style={tabStyle('profile')}>Profile</div>
          <div style={{ ...tabStyle('profile'), color: D.muted, cursor: 'not-allowed', opacity: 0.4 }}>Billing (Soon)</div>
          <div onClick={() => { setActiveTab('api'); setNewlyGeneratedKey(null); }} style={tabStyle('api')}>Developer API</div>
          <div style={{ ...tabStyle('profile'), color: D.muted, cursor: 'not-allowed', opacity: 0.4 }}>Notifications (Soon)</div>
        </aside>

        {/* ── Content ── */}
        <section style={{ flex: 1, minWidth: 0 }}>

          {/* ── API tab ── */}
          {activeTab === 'api' && (
            <>
              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontFamily: D.mono, fontSize: '11px', color: D.accent, letterSpacing: '0.08em', marginBottom: '8px' }}>// Developer API</div>
                <h1 style={{ fontFamily: D.display, fontSize: '22px', fontWeight: 800, margin: 0, color: D.text }}>API & MCP Access</h1>
              </div>

              <div style={{ background: D.surface, border: `1px solid ${D.brand}`, borderRadius: '6px', padding: '24px', marginBottom: '32px', boxShadow: `0 0 24px rgba(174,122,255,0.08)` }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontFamily: D.display, fontWeight: 700, fontSize: '15px', color: D.text }}>MCP Server Configuration</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={newKeyLabel}
                      onChange={e => setNewKeyLabel(e.target.value)}
                      placeholder="Key name..."
                      style={{ ...inputStyle, width: '140px', fontSize: '12px', padding: '7px 10px' }}
                    />
                    <button
                      onClick={handleGenerateKey}
                      style={{ background: D.brand, color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: D.mono, whiteSpace: 'nowrap' }}
                    >
                      + Generate Key
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: D.muted, lineHeight: 1.6, marginBottom: '20px' }}>
                  Use this key to connect Cursor or Windsurf to your Modellr projects. The MCP server lets your IDE read and update your schemas directly from the terminal.
                </p>

                {/* Newly generated key */}
                {newlyGeneratedKey && (
                  <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '4px', padding: '14px 16px', marginBottom: '20px' }}>
                    <div style={{ fontFamily: D.mono, fontSize: '11px', fontWeight: 700, color: D.green, marginBottom: '6px', letterSpacing: '0.06em' }}>⚠ STORE THIS KEY — you won't see it again</div>
                    <div style={{ display: 'flex', background: D.bg, border: `1px solid ${D.border}`, borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ flex: 1, padding: '9px 12px', fontSize: '12px', fontFamily: D.mono, color: D.text, wordBreak: 'break-all' }}>
                        {newlyGeneratedKey}
                      </div>
                      <button
                        onClick={handleCopyKey}
                        style={{ background: isCopied ? D.green : D.surfaceHi, border: 'none', borderLeft: `1px solid ${D.border}`, padding: '0 14px', color: isCopied ? '#050507' : D.text, cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: D.mono, transition: 'all 0.2s', minWidth: '70px' }}
                      >
                        {isCopied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Key list */}
                {loadingKeys ? (
                  <div style={{ fontFamily: D.mono, fontSize: '12px', color: D.muted }}>Loading keys…</div>
                ) : apiKeys.length === 0 ? (
                  <div style={{ fontFamily: D.mono, fontSize: '12px', color: D.muted }}>No API keys generated yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                    {apiKeys.map(key => (
                      <div key={key.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: D.bg, border: `1px solid ${D.border}`, borderRadius: '4px', padding: '10px 14px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: D.text, marginBottom: '3px', fontFamily: D.body }}>{key.label}</div>
                          <div style={{ fontSize: '11px', fontFamily: D.mono, color: D.muted }}>{key.key_prefix}•••••••••••••••••</div>
                        </div>
                        <button
                          onClick={() => handleDeleteKey(key.id)}
                          style={{ background: 'transparent', border: `1px solid ${D.border}`, padding: '5px 10px', borderRadius: '4px', color: D.red, fontSize: '11px', cursor: 'pointer', fontWeight: 600, fontFamily: D.mono, transition: 'border-color 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = D.red)}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = D.border)}
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* MCP setup */}
                <div style={{ paddingTop: '20px', borderTop: `1px solid ${D.border}` }}>
                  <div style={{ fontFamily: D.mono, fontSize: '10px', fontWeight: 700, color: D.muted, marginBottom: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>MCP Setup Instructions</div>
                  <div style={{ background: D.bg, borderRadius: '4px', padding: '14px 16px', fontFamily: D.mono, fontSize: '12px', color: D.muted, lineHeight: 1.7, border: `1px solid ${D.border}`, borderLeft: `3px solid ${D.brand}` }}>
                    <span style={{ color: D.muted }}># Add to Cursor / Windsurf mcp.json:</span><br />
                    {`"mcpServers": {`}<br />
                    &nbsp;&nbsp;{`"Modellr": {`}<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;{`"command": "npx",`}<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;{`"args": ["Modellr-mcp"],`}<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#7dd3fc' }}>{`"env": { "SCHEMA_FORGE_TOKEN": "YOUR_RAW_KEY_HERE", "SCHEMA_FORGE_URL": "${window.location.origin}" }`}</span><br />
                    &nbsp;&nbsp;{`}`}<br />
                    {`}`}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Profile tab ── */}
          {activeTab === 'profile' && (
            <>
              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontFamily: D.mono, fontSize: '11px', color: D.accent, letterSpacing: '0.08em', marginBottom: '8px' }}>// Profile</div>
                <h1 style={{ fontFamily: D.display, fontSize: '22px', fontWeight: 800, margin: 0, color: D.text }}>Profile Settings</h1>
              </div>

              <form
                onSubmit={e => { e.preventDefault(); handleSaveProfile(); }}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '48px', maxWidth: '380px' }}
              >
                <div>
                  <label style={labelStyle}>Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = D.brand)}
                    onBlur={e => (e.currentTarget.style.borderColor = D.border)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    defaultValue={session?.user?.email || ''}
                    readOnly
                    style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{ padding: '10px 20px', background: D.brand, color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: isSaving ? 0.6 : 1, fontFamily: D.mono, boxShadow: `0 0 16px ${D.brandGlow}` }}
                  >
                    {isSaving ? 'Saving…' : 'Save changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayName(session?.user?.user_metadata?.display_name || '')}
                    style={{ padding: '10px 20px', background: 'transparent', color: D.muted, border: `1px solid ${D.border}`, borderRadius: '4px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: D.mono }}
                  >
                    Cancel
                  </button>
                </div>
              </form>

              {/* Danger zone */}
              <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: '28px' }}>
                <div style={{ fontFamily: D.mono, fontSize: '10px', fontWeight: 700, color: D.red, marginBottom: '14px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Danger Zone</div>
                <button
                  onClick={() => setToast('Account deletion is locked during Beta.', 'info')}
                  style={{ padding: '9px 18px', background: 'transparent', color: D.red, border: `1px solid rgba(248,113,113,0.3)`, borderRadius: '4px', fontWeight: 600, cursor: 'pointer', fontSize: '12px', fontFamily: D.mono, transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = D.red)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)')}
                >
                  Delete account
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

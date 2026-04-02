import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../store/ui';

export function Settings() {
  const { session } = useAuthStore();
  const setToast = useUIStore((s) => s.showToast);
  const showDialog = useUIStore((s) => s.showDialog);
  
  const [activeTab, setActiveTab] = useState<'profile' | 'api'>('profile');
  
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // API Key State
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
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName }
    });
    setIsSaving(false);
    if (error) {
      setToast('Failed to update profile: ' + error.message, 'error');
    } else {
      setToast('Profile updated successfully!', 'success');
    }
  };

  const fetchApiKeys = async () => {
    setLoadingKeys(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${baseUrl}/api/keys`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApiKeys(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingKeys(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'api' && session?.access_token) {
      fetchApiKeys();
    }
  }, [activeTab, session?.access_token]);

  const handleGenerateKey = async () => {
    if (!newKeyLabel.trim()) {
      setToast('Please provide a name for your key.', 'error');
      return;
    }
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${baseUrl}/api/keys/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ label: newKeyLabel })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setNewlyGeneratedKey(data.rawKey);
      setIsCopied(false);
      setApiKeys([data.newKey, ...apiKeys]);
      setNewKeyLabel('My Secret Key'); // Reset for next time
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
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error);
          }
          setApiKeys(prev => prev.filter(k => k.id !== id));
        } catch (err: any) {
          setToast('Failed to delete key: ' + err.message, 'error');
        }
      }
    });
  };

  const navItemStyle = (tabName: 'profile' | 'api') => ({
    padding: '8px 16px', 
    borderRadius: '8px', 
    background: activeTab === tabName ? 'var(--surface-base)' : 'transparent', 
    color: activeTab === tabName ? 'var(--text-primary)' : 'var(--text-secondary)', 
    fontWeight: activeTab === tabName ? 600 : 400, 
    cursor: 'pointer', 
    fontSize: '14px', 
    border: activeTab === tabName ? '1px solid var(--border-subtle)' : '1px solid transparent'
  });

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100%', color: 'var(--text-primary)' }}>

      {/* Main Container */}
      <main style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '48px 24px', flex: 1, display: 'flex', gap: '48px' }}>
        
        {/* Sidebar */}
        <aside style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div onClick={() => setActiveTab('profile')} style={navItemStyle('profile')}>Profile</div>
          <div style={{ padding: '8px 16px', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '14px', cursor: 'not-allowed' }}>Billing (Coming Soon)</div>
          <div onClick={() => setActiveTab('api')} style={navItemStyle('api')}>Developer API</div>
          <div style={{ padding: '8px 16px', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '14px', cursor: 'not-allowed' }}>Notifications (Coming Soon)</div>
        </aside>

        {/* Content Pane */}
        <section style={{ flex: 1 }}>
          
          {activeTab === 'api' && (
            <>
              <h1 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 32px 0' }}>Developer API & MCP Access</h1>
              <div style={{ background: 'var(--surface-base)', border: '1px solid rgb(162, 107, 252)', borderRadius: '12px', padding: '24px', marginBottom: '40px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>MCP Server Configuration</div>
                    <div style={{ background: 'rgba(162, 107, 252, 0.1)', color: 'rgb(162, 107, 252)', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', letterSpacing: '0.05em' }}>Phase 5</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      value={newKeyLabel} 
                      onChange={(e) => setNewKeyLabel(e.target.value)} 
                      placeholder="Key name..." 
                      style={{ background: 'var(--canvas-bg)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '12px', width: '150px', outline: 'none' }}
                    />
                    <button 
                      onClick={handleGenerateKey}
                      style={{ background: 'rgb(162, 107, 252)', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      + Generate New Key
                    </button>
                  </div>
                </div>
                
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '24px' }}>
                  Use this key to connect Cursor or Windsurf to your SchemaForge projects. The MCP server lets your IDE read and update your schemas directly from the terminal.
                </p>

                {newlyGeneratedKey && (
                  <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#4ade80', marginBottom: '8px' }}>Store this key securely!</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Make sure to copy your personal access token now. You won't be able to see it again!
                    </div>
                    <div style={{ display: 'flex', background: 'var(--canvas-bg)', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ flex: 1, padding: '10px 14px', fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                        {newlyGeneratedKey}
                      </div>
                      <button 
                        onClick={handleCopyKey}
                        style={{ background: isCopied ? '#4ade80' : 'var(--surface-base)', border: 'none', borderLeft: '1px solid var(--border-subtle)', padding: '0 16px', color: isCopied ? '#000' : 'var(--text-primary)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s', width: '80px' }}>
                        {isCopied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}

                {loadingKeys ? (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading keys...</div>
                ) : apiKeys.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No API keys generated yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                    {apiKeys.map(key => (
                      <div key={key.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--canvas-bg)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px 16px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{key.label}</div>
                          <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{key.key_prefix}•••••••••••••••••</div>
                        </div>
                        <button 
                          onClick={() => handleDeleteKey(key.id)}
                          style={{ background: 'transparent', border: '1px solid var(--border-subtle)', padding: '6px 12px', borderRadius: '6px', color: 'var(--alert-error)', fontSize: '12px', cursor: 'pointer', fontWeight: 500 }}>
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ paddingTop: '24px', borderTop: '1px solid var(--border-subtle)', marginTop: '24px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>MCP Setup Instructions</div>
                  <div style={{ background: 'var(--canvas-bg)', borderRadius: '8px', padding: '16px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    <span style={{ color: 'var(--text-secondary)' }}># Add this to your Cursor / Windsurf settings (mcp.json):</span><br/>
                    {`"mcpServers": {`}<br/>
                    &nbsp;&nbsp;{`"schemaforge": {`} <br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;{`"command": "node",`}<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;{`"args": ["C:/Web Development/SchemaForge/mcp-server/index.js"],`}<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;{`"env": { "SCHEMA_FORGE_TOKEN": "YOUR_RAW_KEY_HERE" }`}<br/>
                    &nbsp;&nbsp;{`}`}<br/>
                    {`}`}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'profile' && (
            <>
              <h1 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 32px 0' }}>Profile Settings</h1>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '48px', maxWidth: '400px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Display Name</label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    style={{ width: '100%', background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Email</label>
                  <input type="email" defaultValue={session?.user?.email || ''} readOnly style={{ width: '100%', background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', color: 'var(--text-secondary)', fontSize: '14px', outline: 'none', opacity: 0.7 }} />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={handleSaveProfile} disabled={isSaving} style={{ padding: '10px 20px', background: 'var(--text-primary)', color: 'var(--canvas-bg)', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: isSaving ? 0.7 : 1 }}>
                    {isSaving ? 'Saving...' : 'Save changes'}
                  </button>
                  <button onClick={() => setDisplayName(session?.user?.user_metadata?.display_name || '')} style={{ padding: '10px 20px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--alert-error)', marginBottom: '16px' }}>Danger zone</div>
                <button onClick={() => setToast('Account deletion is locked during Beta.', 'info')} style={{ padding: '10px 20px', background: 'transparent', color: 'var(--alert-error)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
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

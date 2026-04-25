import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/ui';
import { getTemplate } from '../utils/templates';

import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardStats } from '../components/dashboard/DashboardStats';
import { ProjectCard } from '../components/dashboard/ProjectCard';

import './Dashboard.css';

const FREE_TIER_LIMIT = 3;

export function Dashboard() {
  const { session } = useAuthStore();
  const showDialog = useUIStore((s) => s.showDialog);
  const navigate = useNavigate();
  
  const [schemas, setSchemas] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingSchemas, setIsLoadingSchemas] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [sandboxData, setSandboxData] = useState<any>(null);

  // 1. Load User Data & Schemas
  useEffect(() => {
    async function loadData() {
      if (!session?.user?.id) { setIsLoadingSchemas(false); return; }
      setIsLoadingSchemas(true);

      // Fetch Profile (Tier)
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profile) setUserProfile(profile);

      // Fetch Schemas
      const { data } = await supabase
        .from('schemas')
        .select('*')
        .order('updated_at', { ascending: false });

      if (data) setSchemas(data);
      setIsLoadingSchemas(false);
    }
    loadData();
  }, [session]);

  // 2. Check for Sandbox
  useEffect(() => {
    // Only show if the user isn't already "in" a session where they dismissed it
    const dismissedThisSession = sessionStorage.getItem('dismissed_sandbox_claim');
    if (dismissedThisSession) return;

    const local = localStorage.getItem('sandbox_schema');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed.tables && parsed.tables.length > 0) {
          setSandboxData(parsed);
          setShowClaimModal(true);
        }
      } catch {}
    }
  }, []);

  // 3. Handlers
  const handleCreateNew = async (templateId?: string) => {
    if (!session?.user?.id) return;
    if (schemas.length >= FREE_TIER_LIMIT) return;
    
    let initialState = null;
    let name = 'Untitled Project';

    if (templateId) {
      const tpl = getTemplate(templateId);
      if (tpl) {
        name = tpl.label + ' Template';
        initialState = { tables: tpl.tables, relationships: tpl.relationships, viewport: { x: 0, y: 0, zoom: 1 } };
      }
    }

    const { data } = await supabase
      .from('schemas')
      .insert([{ owner_id: session.user.id, name, canvas_state: initialState }])
      .select().single();

    if (data) navigate(`/app/${data.id}`);
  };

  const handleDuplicate = async (e: React.MouseEvent, schema: any) => {
    e.stopPropagation();
    if (!session?.user?.id || schemas.length >= FREE_TIER_LIMIT) return;

    const { data } = await supabase
      .from('schemas')
      .insert([{ owner_id: session.user.id, name: schema.name + ' (Copy)', canvas_state: schema.canvas_state }])
      .select().single();

    if (data) setSchemas([data, ...schemas]);
  };

  const handleExport = (e: React.MouseEvent, schema: any) => {
    e.stopPropagation();
    const dataStr = typeof schema.canvas_state === 'string' ? schema.canvas_state : JSON.stringify(schema.canvas_state, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${schema.name.replace(/\s+/g, '_').toLowerCase()}_schema.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    showDialog({
      title: 'Delete Schema',
      message: 'Are you sure you want to permanently delete this schema? This action cannot be undone.',
      type: 'confirm',
      onConfirm: async () => {
        await supabase.from('schemas').delete().eq('id', id);
        // Fix #29: use functional updater to avoid stale closure
        setSchemas((prev) => prev.filter((s) => s.id !== id));
      }
    });
  };

  const handleClaimSandbox = async () => {
    if (!session?.user?.id || !sandboxData) return;

    // Fix #28: sandbox claim must respect the free tier limit like all other creates
    if (schemas.length >= FREE_TIER_LIMIT) {
      useUIStore.getState().showToast(
        `You've reached the ${FREE_TIER_LIMIT}-schema free tier limit. Upgrade to Pro to save this sandbox.`,
        'error'
      );
      setShowClaimModal(false);
      return;
    }

    const { data } = await supabase
      .from('schemas')
      .insert([{ owner_id: session.user.id, name: 'Saved Sandbox', canvas_state: sandboxData }])
      .select().single();
    if (data) {
      localStorage.removeItem('sandbox_schema');
      setSchemas((prev) => [data, ...prev]);
      navigate(`/app/${data.id}`);
    }
  };

  const filteredSchemas = schemas.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const limitReached = schemas.length >= FREE_TIER_LIMIT;

  return (
    <>
      <main className="dashboard-main">
        <DashboardHeader 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onCreateNew={() => handleCreateNew()}
          limitReached={limitReached}
        />

        <DashboardStats 
          schemas={schemas} 
          limit={userProfile?.tier === 'pro' ? 999 : FREE_TIER_LIMIT} 
          userTier={userProfile?.tier || 'free'}
        />

        {/* Pro Up-sell banner */}
        {limitReached && (
          <div className="pro-banner" style={{ padding: '20px 24px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#e8e8f0', fontFamily: "'Syne','Geist',sans-serif" }}>Unlock unlimited projects</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b6b80', fontFamily: "'Instrument Sans','Geist',sans-serif" }}>You've reached the free tier limit of 3 schemas. Upgrade to Pro for unlimited canvases.</p>
            </div>
            <button onClick={() => navigate('/pricing')} className="btn-primary">Upgrade — $15/mo</button>
          </div>
        )}

        <div className="projects-section">
          <div className="projects-section-header">
            <h2>Your Projects</h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{filteredSchemas.length} projects found</div>
          </div>

          {/* Fix #59: show loading indicator instead of flashing empty state */}
          {isLoadingSchemas ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#6b6b80', fontSize: '13px', fontFamily: "'Geist Mono',monospace" }}>
              Loading your schemas…
            </div>
          ) : (
            <div className="projects-grid">
              {filteredSchemas.map(schema => (
                <ProjectCard 
                  key={schema.id} 
                  schema={schema}
                  onDuplicate={handleDuplicate}
                  onExport={handleExport}
                  onDelete={handleDelete}
                />
              ))}

              <div className="create-card" onClick={() => handleCreateNew()}>
                <div className="create-icon">+</div>
                <div style={{ fontWeight: 700, color: '#e8e8f0', marginBottom: '4px', fontFamily: "'Syne','Geist',sans-serif", fontSize: '14px' }}>New Design</div>
                <div style={{ fontSize: '12px', color: '#6b6b80', fontFamily: "'Geist Mono',monospace" }}>Start from scratch</div>
              </div>
            </div>
          )}
        </div>

        <div id="templates" style={{ marginTop: '56px' }}>
          <div className="projects-section-header">
            <h2>Suggested Starters</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[
              { id: 'ecommerce', name: 'E-commerce' },
              { id: 'saas', name: 'Multi-tenant SaaS' },
              { id: 'blog', name: 'Blog + CMS' },
              { id: 'auth', name: 'Social App' }
            ].map(tpl => (
              <div key={tpl.id} className="sidebar-link" onClick={() => handleCreateNew(tpl.id)} style={{ background: '#0c0c10', border: '1px solid #1e1e2e', padding: '14px 16px', justifyContent: 'center', borderRadius: '5px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#ae7aff')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e2e')}
              >
                <span style={{ fontWeight: 600, fontSize: '13px', color: '#e8e8f0', fontFamily: "'Instrument Sans','Geist',sans-serif" }}>{tpl.name}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {showClaimModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)' }}>
          <div style={{ background: '#0c0c10', padding: '32px', borderRadius: '8px', maxWidth: '380px', width: '90%', border: '1px solid #2e2e4e', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}>
            <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: '11px', color: '#00e5a0', letterSpacing: '0.08em', marginBottom: '10px' }}>// Sandbox work detected</div>
            <h2 style={{ fontFamily: "'Syne','Geist',sans-serif", fontSize: '20px', fontWeight: 800, color: '#e8e8f0', marginTop: 0, marginBottom: '10px' }}>Save Sandbox Work?</h2>
            <p style={{ color: '#6b6b80', lineHeight: 1.6, fontSize: '14px', marginBottom: '28px' }}>Would you like to move the progress you made in the sandbox to your new cloud dashboard?</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleClaimSandbox} style={{ flex: 1, background: '#ae7aff', color: '#fff', border: 'none', padding: '11px', borderRadius: '4px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Geist Mono',monospace", fontSize: '13px', boxShadow: '0 0 16px rgba(174,122,255,0.2)' }}>Save to Cloud</button>
              <button
                onClick={() => {
                  localStorage.removeItem('sandbox_schema');
                  sessionStorage.setItem('dismissed_sandbox_claim', 'true');
                  setShowClaimModal(false);
                }}
                style={{ flex: 1, background: 'transparent', border: '1px solid #1e1e2e', color: '#6b6b80', borderRadius: '4px', cursor: 'pointer', fontFamily: "'Geist Mono',monospace", fontSize: '13px', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#2e2e4e')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e2e')}
              >Discard</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

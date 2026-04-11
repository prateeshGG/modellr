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
  const [isLoadingSchemas, setIsLoadingSchemas] = useState(true);  // Fix #59
  
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [sandboxData, setSandboxData] = useState<any>(null);

  // 1. Load Schemas
  useEffect(() => {
    async function loadSchemas() {
      if (!session?.user?.id) { setIsLoadingSchemas(false); return; }
      setIsLoadingSchemas(true);
      const { data } = await supabase
        .from('schemas')
        .select('*')
        .order('updated_at', { ascending: false });

      if (data) setSchemas(data);
      setIsLoadingSchemas(false);
    }
    loadSchemas();
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

        <DashboardStats schemas={schemas} limit={FREE_TIER_LIMIT} />

        {/* Pro Up-sell banner */}
        {limitReached && (
          <div className="pro-banner" style={{ background: 'var(--surface-base)', padding: '24px', borderRadius: '16px', border: '1px solid var(--brand)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Unlock unlimited projects</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>You've reached the free tier limit of 3 schemas. Upgrade to Pro for unlimited canvases.</p>
            </div>
            <button onClick={() => navigate('/pricing')} className="btn-primary">Upgrade — $12/mo</button>
          </div>
        )}

        <div className="projects-section">
          <div className="projects-section-header">
            <h2>Your Projects</h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{filteredSchemas.length} projects found</div>
          </div>

          {/* Fix #59: show loading indicator instead of flashing empty state */}
          {isLoadingSchemas ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
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
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>New Design</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Start from scratch</div>
              </div>
            </div>
          )}
        </div>

        {/* Template Gallery Quick-picks */}
        <div id="templates" style={{ marginTop: '64px' }}>
          <div className="projects-section-header">
            <h2>Suggested Starters</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[
              { id: 'ecommerce', name: 'E-commerce' },
              { id: 'saas', name: 'Multi-tenant SaaS' },
              { id: 'blog', name: 'Blog + CMS' },
              { id: 'auth', name: 'Social App' }
            ].map(tpl => (
              <div key={tpl.id} className="sidebar-link" onClick={() => handleCreateNew(tpl.id)} style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', padding: '16px', justifyContent: 'center' }}>
                <span style={{ fontWeight: 600 }}>{tpl.name}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {showClaimModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'var(--surface-base)', padding: '32px', borderRadius: '24px', maxWidth: '400px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <h2 style={{ marginTop: 0 }}>Save Sandbox Work?</h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>Would you like to move the progress you made in the sandbox to your new cloud dashboard?</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button onClick={handleClaimSandbox} className="btn-primary" style={{ flex: 1 }}>Save to Cloud</button>
              <button 
                onClick={() => { 
                  localStorage.removeItem('sandbox_schema'); 
                  sessionStorage.setItem('dismissed_sandbox_claim', 'true');
                  setShowClaimModal(false); 
                }} 
                style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', borderRadius: '10px', cursor: 'pointer' }}
              >Discard</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

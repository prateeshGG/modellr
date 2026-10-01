import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/ui';
import { getTemplate } from '../utils/templates';
import {
  createProject,
  deleteProject,
  duplicateProject,
  exportAllProjectsJson,
  importProjectsJson,
  listProjects,
  storageMode,
  type Project,
} from '../lib/projectStore';

import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardStats } from '../components/dashboard/DashboardStats';
import { ProjectCard } from '../components/dashboard/ProjectCard';

import './Dashboard.css';

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function Dashboard() {
  const showDialog = useUIStore((s) => s.showDialog);
  const showToast = useUIStore((s) => s.showToast);
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setProjects(await listProjects());
    } catch {
      showToast('Could not read projects from browser storage.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreateNew = async (templateId?: string) => {
    if (creating) return; // guard against double-clicks creating duplicates
    setCreating(true);
    try {
      let name = 'Untitled schema';
      let canvas_state = null;
      if (templateId) {
        const tpl = getTemplate(templateId);
        if (tpl) {
          name = `${tpl.label} starter`;
          canvas_state = { tables: tpl.tables, relationships: tpl.relationships };
        }
      }
      const project = await createProject({ name, canvas_state });
      navigate(`/app/${project.id}`);
    } catch {
      showToast('Could not create the project (browser storage may be full or blocked).', 'error');
      setCreating(false);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const copy = await duplicateProject(project.id);
    if (copy) setProjects((prev) => [copy, ...prev]);
  };

  const handleExport = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const safe = project.name.replace(/[^\w-]+/g, '_').toLowerCase() || 'schema';
    download(`${safe}.modellr.json`, JSON.stringify({ name: project.name, canvas_state: project.canvas_state, snapshots: project.snapshots ?? [] }, null, 2));
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    showDialog({
      title: 'Delete schema',
      message: 'Delete this schema from this browser? This cannot be undone. Export it first if you may need it.',
      type: 'confirm',
      onConfirm: async () => {
        await deleteProject(id);
        setProjects((prev) => prev.filter((p) => p.id !== id));
      },
    });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const n = await importProjectsJson(await file.text());
      showToast(`Imported ${n} schema${n === 1 ? '' : 's'}`, 'success');
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Import failed', 'error');
    }
  };

  const handleBackup = async () => {
    download(`modellr-backup-${new Date().toISOString().slice(0, 10)}.json`, await exportAllProjectsJson());
  };

  const filtered = projects.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <main className="dashboard-main">
      <DashboardHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onCreateNew={() => handleCreateNew()}
        onImport={() => fileRef.current?.click()}
        onBackup={handleBackup}
        canBackup={projects.length > 0}
      />
      <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleImportFile} />

      {storageMode() === 'memory' && (
        <div style={{ padding: '12px 16px', borderRadius: 6, marginBottom: 24, background: 'var(--alert-warning)', color: '#000', fontSize: 13 }}>
          Your browser is blocking local storage. Projects will be lost when you close this tab. Use Export to keep your work.
        </div>
      )}

      <DashboardStats projects={projects} />

      <div className="projects-section">
        <div className="projects-section-header">
          <h2>Your projects</h2>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {filtered.length} saved in this browser
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading…</div>
        ) : (
          <div className="projects-grid">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                schema={project}
                onDuplicate={handleDuplicate}
                onExport={handleExport}
                onDelete={handleDelete}
              />
            ))}

            <div className="create-card" onClick={() => handleCreateNew()}>
              <div className="create-icon">+</div>
              <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '14px' }}>New schema</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Start from scratch</div>
            </div>
          </div>
        )}

        <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
          Projects are stored only in this browser. Clearing site data deletes them, so use <b>Backup</b> now and then.
        </p>
      </div>

      <div id="templates" style={{ marginTop: '56px' }}>
        <div className="projects-section-header">
          <h2>Start from a template</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {[
            { id: 'ecommerce', name: 'E-commerce' },
            { id: 'saas', name: 'Multi-tenant SaaS' },
            { id: 'blog', name: 'Blog + CMS' },
            { id: 'auth', name: 'Social app' },
          ].map((tpl) => (
            <div
              key={tpl.id}
              className="sidebar-link"
              role="button"
              tabIndex={0}
              onClick={() => handleCreateNew(tpl.id)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateNew(tpl.id)}
              style={{ border: '1px solid var(--border-subtle)', padding: '14px 16px', justifyContent: 'center', borderRadius: '5px', cursor: 'pointer' }}
            >
              <span style={{ fontWeight: 600, fontSize: '13px' }}>{tpl.name}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

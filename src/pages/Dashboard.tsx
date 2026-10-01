import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSeo } from '../lib/seo';
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


function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function Dashboard() {
  useSeo({ title: 'Projects', noindex: true });
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
    <>
      <DashboardHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onCreateNew={() => handleCreateNew()}
        onImport={() => fileRef.current?.click()}
        onBackup={handleBackup}
        canBackup={projects.length > 0}
        creating={creating}
      />
      <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleImportFile} aria-label="Import a Modellr JSON file" />

      {storageMode() === 'memory' && (
        <div className="n-alert n-alert--warn" role="alert" style={{ marginBottom: 24 }}>
          <span><b>Storage blocked.</b> Your browser is blocking local storage, so projects will be lost when you close this tab. Use Export to keep your work.</span>
        </div>
      )}

      {projects.length > 0 && <DashboardStats projects={projects} />}

      {loading ? (
        <div className="n-cards-fit" aria-busy="true" aria-label="Loading projects">
          {[0, 1, 2].map((i) => <div key={i} className="n-skeleton" style={{ height: 300, borderRadius: 12 }} />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="n-empty">
          <h2 className="n-h3">No projects yet.</h2>
          <p className="n-small" style={{ maxWidth: '36em' }}>Start from a blank schema, a template, or paste the SQL you already have. Everything you make is saved in this browser only.</p>
          <div className="n-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="n-btn" onClick={() => handleCreateNew()} disabled={creating}>New schema</button>
            <Link className="n-arrow" to="/app/templates">Browse templates</Link>
          </div>
        </div>
      ) : (
        <>
          <p className="n-small" style={{ marginBottom: 16 }}>{filtered.length} saved in this browser</p>
          {filtered.length === 0 ? (
            <div className="n-empty"><h2 className="n-h3">No project matches "{searchQuery}".</h2><button type="button" className="n-btn n-btn--secondary" onClick={() => setSearchQuery('')}>Clear search</button></div>
          ) : (
            <div className="n-cards-fit">
              {filtered.map((project) => (
                <ProjectCard key={project.id} schema={project} onDuplicate={handleDuplicate} onExport={handleExport} onDelete={handleDelete} />
              ))}
              <button type="button" className="n-card n-card--new" onClick={() => handleCreateNew()} disabled={creating}>
                <span aria-hidden="true">+</span>
                <span>New schema</span>
                <span className="n-small">Start from scratch</span>
              </button>
            </div>
          )}
        </>
      )}

      <section style={{ marginTop: 56 }} aria-labelledby="dash-templates">
        <h2 id="dash-templates" className="n-h3" style={{ marginBottom: 16 }}>Start from a template</h2>
        <div className="n-toolbar">
          {[
            { id: 'ecommerce', name: 'E-commerce' },
            { id: 'saas', name: 'Multi-tenant SaaS' },
            { id: 'blog', name: 'Blog + CMS' },
            { id: 'auth', name: 'Auth & Users' },
          ].map((tpl) => (
            <button key={tpl.id} type="button" className="n-chip" onClick={() => handleCreateNew(tpl.id)} disabled={creating}>{tpl.name}</button>
          ))}
        </div>
        <p className="n-small">Projects are stored only in this browser. Clearing site data deletes them, so use <b>Backup all</b> now and then.</p>
      </section>
    </>
  );
}

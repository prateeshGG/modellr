import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useProjectPersistence } from '../hooks/useProjectPersistence';
import { useShareLink } from '../hooks/useShareLink';
import { TopBar } from '../components/topbar/TopBar';
import { Sidebar } from '../components/sidebar/Sidebar';
import { SchemaCanvas } from '../components/canvas/SchemaCanvas';
import { CodePanel } from '../components/editor/CodePanel';
import { RightPanel } from '../components/panel/RightPanel';
import { StatusBar } from '../components/statusbar/StatusBar';
import { CommandPalette } from '../components/palette/CommandPalette';
import { ImportDialog } from '../components/importer/ImportDialog';
import { DiffViewer } from '../components/diff/DiffViewer';
import { SearchOverlay } from '../components/search/SearchOverlay';
import { AIBottomDrawer } from '../components/ai/AIBottomDrawer';
import { useUIStore } from '../store/ui';
import { useSchemaStore } from '../store/schema';
import { createProject, storageMode } from '../lib/projectStore';
import '../App.css';

interface EditorProps {
  /** Landing-page demo: loads a starter template and never saves. */
  isSandbox?: boolean;
  /** Read-only view of a schema carried in the URL hash. */
  isSharedView?: boolean;
}

/** Open a window event listener for the lifetime of the component. */
function useWindowEvent(name: string, handler: () => void) {
  useEffect(() => {
    window.addEventListener(name, handler);
    return () => window.removeEventListener(name, handler);
  }, [name, handler]);
}

export default function Editor({ isSandbox = false, isSharedView = false }: EditorProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  useKeyboardShortcuts();
  useSeo({ title: isSharedView ? 'Shared schema' : 'Editor', noindex: true, disabled: isSandbox });

  const persistedId = isSandbox || isSharedView ? undefined : id;
  const status = useProjectPersistence(persistedId);
  const { copyShareLink } = useShareLink(isSharedView);
  const setReadOnly = useUIStore((s) => s.setReadOnly);
  const mode = useUIStore((s) => s.mode);

  const [importOpen, setImportOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [aiGenOpen, setAiGenOpen] = useState(false);

  useWindowEvent('sf:open-import', () => setImportOpen(true));
  useWindowEvent('sf:open-diff', () => setDiffOpen(true));
  useWindowEvent('sf:open-search', () => setSearchOpen(true));
  useWindowEvent('sf:open-ai-generate', () => setAiGenOpen(true));
  useWindowEvent('sf:share', () => { copyShareLink(); });

  // A project that no longer exists sends the user back to the dashboard.
  useEffect(() => {
    if (status === 'missing') navigate('/app', { replace: true });
  }, [status, navigate]);

  // Landing-page sandbox: start from a template, never persist.
  useEffect(() => {
    if (!isSandbox) return;
    let cancelled = false;
    import('../utils/templates').then(({ TEMPLATES }) => {
      const tpl = TEMPLATES.ecommerce;
      if (cancelled || !tpl) return;
      useSchemaStore.getState().importTables(tpl.tables, tpl.relationships);
      useSchemaStore.temporal.getState().clear();
    });
    return () => { cancelled = true; };
  }, [isSandbox]);

  // Never leave the app stuck in read-only mode after leaving a shared view.
  useEffect(() => () => setReadOnly(false), [setReadOnly]);

  const saveCopy = async () => {
    const s = useSchemaStore.getState();
    const project = await createProject({
      name: s.projectName,
      canvas_state: { tables: s.tables, relationships: s.relationships, notes: s.notes, groups: s.groups },
    });
    setReadOnly(false);
    navigate(`/app/${project.id}`);
  };

  if (!isSandbox && !isSharedView && status === 'loading') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Opening project…
      </div>
    );
  }

  const canEdit = !isSharedView;

  return (
    <div className="app-shell">
      {isSharedView && (
        <div className="app-banner" role="status">
          <span>You are viewing a read-only shared snapshot.</span>
          <button type="button" className="app-banner__btn" onClick={saveCopy}>Save a copy to edit</button>
        </div>
      )}
      {!isSandbox && !isSharedView && storageMode() === 'memory' && (
        <div className="app-banner app-banner--warn" role="alert">
          Your browser is blocking local storage, so this project will be lost when you close the tab. Export it before leaving.
        </div>
      )}
      <TopBar
        isHost={canEdit}
        onImportClick={() => setImportOpen(true)}
        onDiffClick={() => setDiffOpen(true)}
      />

      <div className="app-body">
        <Sidebar isHost={canEdit} />

        <main
          className={[
            'app-canvas-area',
            mode === 'split' ? 'app-canvas-area--split' : '',
            mode === 'code'  ? 'app-canvas-area--code'  : '',
          ].filter(Boolean).join(' ')}
        >
          {/* Keep SchemaCanvas mounted so React Flow preserves viewport/node positions across
              mode switches; hide it with CSS instead of unmounting. */}
          <div
            className="app-canvas-pane"
            style={{ display: mode === 'code' ? 'none' : 'flex', flex: 1, minHeight: 0 }}
          >
            <SchemaCanvas />
          </div>
          {mode !== 'canvas' && (
            <div className="app-code-pane">
              <CodePanel />
            </div>
          )}
        </main>

        <RightPanel />
      </div>

      <StatusBar />

      <CommandPalette />
      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} />}
      {diffOpen   && <DiffViewer  onClose={() => setDiffOpen(false)} />}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      <AIBottomDrawer isOpen={aiGenOpen} onClose={() => setAiGenOpen(false)} />
    </div>
  );
}

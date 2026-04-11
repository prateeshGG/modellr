import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useCloudPersistence } from '../hooks/useCloudPersistence';
import { useShareLink } from '../hooks/useShareLink';
import { TopBar } from '../components/topbar/TopBar';
import { Sidebar } from '../components/sidebar/Sidebar';
import { SchemaCanvas } from '../components/canvas/SchemaCanvas';
import { CodePanel } from '../components/editor/CodePanel';
import { RightPanel } from '../components/panel/RightPanel';
import { StatusBar } from '../components/statusbar/StatusBar';
import { CommandPalette } from '../components/palette/CommandPalette';
import { Toast } from '../components/shared/Toast';
import { ImportDialog } from '../components/importer/ImportDialog';
import { DiffViewer } from '../components/diff/DiffViewer';
import { SearchOverlay } from '../components/search/SearchOverlay';
import { AIBottomDrawer } from '../components/ai/AIBottomDrawer';
import { LiveImportDialog } from '../components/importer/LiveImportDialog';
import { MultiplayerCursors } from '../components/canvas/MultiplayerCursors';
import { useUIStore } from '../store/ui';
import { useYjsStore } from '../store/yjsStore';
import { useSchemaStore } from '../store/schema';
import { useAuthStore } from '../store/authStore';
import '../App.css';

function SandboxLimiter() {
  const { session } = useAuthStore();
  const tables = useSchemaStore((s) => s.tables);
  const removeTable = useSchemaStore((s) => s.removeTable);
  const setToast = useUIStore((s) => s.showToast);
  
  useEffect(() => {
    // DO NOT limit if the user is authenticated — they can use the sandbox freely.
    if (session) return;

    if (tables.length > 5) {
      const newest = tables[tables.length - 1];
      removeTable(newest.id);
      // Fallback from alert() to styled toast
      setToast("Sandbox Limit Reached: Guests can only create up to 5 tables. Please Sign Up to unlock unlimited tables!", "error");
    }
  }, [tables.length, tables, removeTable, session, setToast]);
  
  return null;
}

export default function Editor({ isSandbox = false, isSharedView = false }: { isSandbox?: boolean; isSharedView?: boolean }) {
  const { id } = useParams();
  useKeyboardShortcuts();
  
  // Pass the sandbox flag to the hook natively
  const { schemaOwnerId } = useCloudPersistence(isSandbox);
  const { session } = useAuthStore();
  const allowGuestEdits = useSchemaStore((s) => s.allowGuestEdits);
  const setReadOnly = useUIStore((s) => s.setReadOnly);

  useEffect(() => {
    if (isSandbox || isSharedView) return;
    if (!schemaOwnerId) return; // Haven't loaded yet
    
    // Evaluate if the current user owns this schema
    // Strict check: both must be defined and truthy
    const hostStatus = !!session?.user?.id && !!schemaOwnerId && session.user.id === schemaOwnerId;
    setIsHost(hostStatus);

    if (!hostStatus && !allowGuestEdits) {
      setReadOnly(true);
      // Immediately clear our cursor from the room if we are now View-Only
      useYjsStore.getState().clearCursor();
    } else {
      setReadOnly(false);
    }
  }, [schemaOwnerId, session, allowGuestEdits, isSandbox, setReadOnly]);

  // Clean up read-only when leaving editor
  useEffect(() => {
    return () => setReadOnly(false);
  }, [setReadOnly]);

  const { copyShareLink } = useShareLink();   // decodes share-link hash on startup

  const mode = useUIStore((s) => s.mode);
  const [isHost, setIsHost] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [aiGenOpen, setAiGenOpen] = useState(false);
  const [liveImportOpen, setLiveImportOpen] = useState(false);

  // Allow CommandPalette → Import dialog via custom event
  useEffect(() => {
    const handler = () => setImportOpen(true);
    window.addEventListener('sf:open-import', handler);
    return () => window.removeEventListener('sf:open-import', handler);
  }, []);

  // Allow CommandPalette → Diff viewer via custom event
  useEffect(() => {
    const handler = () => setDiffOpen(true);
    window.addEventListener('sf:open-diff', handler);
    return () => window.removeEventListener('sf:open-diff', handler);
  }, []);

  // Allow CommandPalette → Share link copy
  useEffect(() => {
    const handler = () => copyShareLink();
    window.addEventListener('sf:share', handler);
    return () => window.removeEventListener('sf:share', handler);
  }, [copyShareLink]);

  // Ctrl+F / Command Palette → search overlay
  useEffect(() => {
    const handler = () => setSearchOpen(true);
    window.addEventListener('sf:open-search', handler);
    return () => window.removeEventListener('sf:open-search', handler);
  }, []);

  // AI Generate schema dialog
  useEffect(() => {
    const handler = () => setAiGenOpen(true);
    window.addEventListener('sf:open-ai-generate', handler);
    return () => window.removeEventListener('sf:open-ai-generate', handler);
  }, []);

  // Live Import dialog
  useEffect(() => {
    const handler = () => setLiveImportOpen(true);
    window.addEventListener('sf:open-live-import', handler);
    return () => window.removeEventListener('sf:open-live-import', handler);
  }, []);

  // Yjs Auto-join and cursor broadcasting
  useEffect(() => {
    let joined = false;
    // Do not join WebSockets if we are in an offline sandbox or stateless view
    if (id && !isSandbox && !isSharedView) {
      useYjsStore.getState().joinRoom(id);
      joined = true;
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!useYjsStore.getState().connected) return;
      useYjsStore.getState().broadcastCursor(e.clientX, e.clientY);
    };

    // Throttle cursor broadcast to ~30fps to prevent excessive Yjs awareness updates
    // which cause re-renders during connection drawing (the drag "stutter")
    let lastCursorBroadcast = 0;
    const handlePointerMoveThrottled = (e: PointerEvent) => {
      const now = Date.now();
      if (now - lastCursorBroadcast < 33) return; // ~30fps
      lastCursorBroadcast = now;
      handlePointerMove(e);
    };

    window.addEventListener('pointermove', handlePointerMoveThrottled);
    return () => {
      window.removeEventListener('pointermove', handlePointerMoveThrottled);
      if (joined) {
        useYjsStore.getState().leaveRoom(false);
      }
    };
  }, [id, isSandbox]);

  // Sandbox LocalStorage Sync Bridge
  useEffect(() => {
    if (!isSandbox || isSharedView) return;
    
    const saved = localStorage.getItem('sandbox_schema');
    const searchParams = new URLSearchParams(window.location.search);
    const templateParam = searchParams.get('template');

    if (templateParam) {
      // Force load the template from query string
      import('../utils/templates').then(({ getTemplate }) => {
        const tpl = getTemplate(templateParam);
        if (tpl) {
          useSchemaStore.getState().importTables(tpl.tables, tpl.relationships);
          useUIStore.getState().showToast(`Loaded ${tpl.label} template`, "success");
          
          // Clear URL parameter natively without reloading the page or breaking react router
          const newUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, '', newUrl);
        }
      });
    } else if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.tables && parsed.relationships) {
          useSchemaStore.getState().importTables(parsed.tables, parsed.relationships);
        }
      } catch (e) { console.error('Failed to parse sandbox schema'); }
    } else {
      // Import a stunning default E-Commerce template so the sandbox isn't empty!
      import('../utils/templates').then(({ TEMPLATES }) => {
        const ecommerce = TEMPLATES.ecommerce;
        if (ecommerce) {
          useSchemaStore.getState().importTables(ecommerce.tables, ecommerce.relationships);
        }
      });
    }

    const unsub = useSchemaStore.subscribe((state) => {
      // If the user is logged in, the home page sandbox is just a non-persistent preview. 
      // We only save to localStorage if they are a Guest, so it can be claimed later.
      if (session) return;

      localStorage.setItem('sandbox_schema', JSON.stringify({
        tables: state.tables,
        relationships: state.relationships
      }));
    });
    return () => unsub();
  }, [isSandbox, session]);

  return (
    <div className="app-shell">
      {isSandbox && !isSharedView && <SandboxLimiter />}
      <TopBar
        isHost={isHost}
        onImportClick={() => setImportOpen(true)}
        onDiffClick={() => setDiffOpen(true)}
      />

      <div className="app-body">
        <Sidebar isHost={isHost} />

        <main
          className={[
            'app-canvas-area',
            mode === 'split' ? 'app-canvas-area--split' : '',
            mode === 'code'  ? 'app-canvas-area--code'  : '',
          ].filter(Boolean).join(' ')}
        >
          {/* Fix #30: Always keep SchemaCanvas mounted so React Flow preserves viewport/node positions
              across mode switches. Use CSS to hide it rather than unmounting. */}
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

      <MultiplayerCursors />
      <StatusBar />

      {/* Overlays */}
      <CommandPalette />
      <Toast />
      {importOpen  && <ImportDialog onClose={() => setImportOpen(false)} />}
      {diffOpen    && <DiffViewer  onClose={() => setDiffOpen(false)} />}
      {searchOpen  && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      <AIBottomDrawer isOpen={aiGenOpen} onClose={() => setAiGenOpen(false)} />
      {liveImportOpen && <LiveImportDialog onClose={() => setLiveImportOpen(false)} />}
    </div>
  );
}

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { create } from 'zustand';
import { useSchemaStore } from './schema';
import { useAuthStore } from './authStore';
import { useUIStore } from './ui';

// ── Constants ──────────────────────────────────────────────────────────────
const WS_BASE = 'ws://localhost:3001';

const COLLAB_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6',
];

// ── Local user identity (persisted across refreshes) ──────────────────────
function getLocalUser(): { name: string; color: string } {
  const authUser = useAuthStore.getState().user;
  let name = authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0];
  
  if (!name) {
    try {
      const stored = localStorage.getItem('sf-user-name');
      if (stored) name = stored;
    } catch {}
  }

  if (!name) {
    name = `Guest ${Math.floor(Math.random() * 9000) + 1000}`;
    try { localStorage.setItem('sf-user-name', name); } catch {}
  }

  let color = COLLAB_COLORS[0];
  try {
    const stored = localStorage.getItem('sf-user-color');
    if (stored) {
      color = stored;
    } else {
      color = COLLAB_COLORS[Math.floor(Math.random() * COLLAB_COLORS.length)];
      localStorage.setItem('sf-user-color', color);
    }
  } catch {}

  return { name, color };
}

// ── Room ID URL helpers ───────────────────────────────────────────────────
export function getRoomFromURL(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('room') || null;
}

/** Handled by React Router now — no-op */
export function setRoomInURL(/* roomId: string */) {
  // Navigation is handled at the component layer
}

/** Returns the full share URL for the current room */
export function buildShareURL(roomId: string): string {
  return `${window.location.origin}/app/${roomId}`;
}

export function clearRoomFromURL() {
  // Navigation handled by React Router (e.g., navigate('/app'))
}

export function generateRoomId(): string {
  return Math.random().toString(36).slice(2, 9);
}

// ── Types ─────────────────────────────────────────────────────────────────
export interface Collaborator {
  clientId: number;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
}

interface YjsState {
  roomId: string | null;
  connected: boolean;
  collaborators: Collaborator[];
  doc: Y.Doc | null;
  provider: WebsocketProvider | null;
  isApplyingRemote: boolean;
}

interface YjsActions {
  joinRoom: (roomId: string) => void;
  leaveRoom: (clearUrl?: boolean) => void;
  broadcastCursor: (x: number, y: number) => void;
  clearCursor: () => void;
  setApplyingRemote: (val: boolean) => void;
}

// ── Store ─────────────────────────────────────────────────────────────────
export const useYjsStore = create<YjsState & YjsActions>()((set, get) => ({
  roomId: null,
  connected: false,
  collaborators: [],
  doc: null,
  provider: null,
  isApplyingRemote: false,
  
  setApplyingRemote: (val) => set({ isApplyingRemote: val }),

  joinRoom: (roomId: string) => {
    // ── Clean up any existing session without touching the URL ───────────
    const existing = get();
    if (existing.provider) {
      (existing.provider as any)._schemaUnsub?.();
      existing.provider.disconnect();
      existing.provider.destroy();
    }
    if (existing.doc) existing.doc.destroy();

    // ── React Router handles URL updates ───────────────────────────────

    const doc = new Y.Doc();
    const localUser = getLocalUser();

    const provider = new WebsocketProvider(WS_BASE, roomId, doc, {
      connect: true,
    });

    // ── Awareness: advertise our own name + color ─────────────────────────
    provider.awareness.setLocalStateField('user', {
      name: localUser.name,
      color: localUser.color,
      cursor: null,
    });

    // ── Awareness: listen for remote presence changes ─────────────────────
    provider.awareness.on('change', () => {
      const localId = doc.clientID;
      const states = provider.awareness.getStates();
      const collabs: Collaborator[] = Array.from(states.entries())
        .filter(([id]) => (id as number) !== localId)
        .map(([id, state]) => ({
          clientId: id as number,
          name: (state as any).user?.name ?? 'Collaborator',
          color: (state as any).user?.color ?? '#888',
          cursor: (state as any).user?.cursor ?? null,
        }));
      set({ collaborators: collabs });
    });

    // ── Yjs → Zustand  (remote changes come in) ───────────────────────────
    const ySchema = doc.getMap<string>('schema');
    ySchema.observe((event) => {
      // Ignore our own outgoing changes immediately
      if (event.transaction.local) return;
      if (get().isApplyingRemote) return;
      
      const tablesJson = ySchema.get('tables');
      const relsJson   = ySchema.get('relationships');
      const allowGuestEditsJson = ySchema.get('allowGuestEdits');
      if (!tablesJson) return;
      
      try {
        get().setApplyingRemote(true);
        const tables = JSON.parse(tablesJson);
        const rels   = relsJson ? JSON.parse(relsJson) : [];
        const allowGuestEdits = allowGuestEditsJson ? JSON.parse(allowGuestEditsJson) : undefined;
        useSchemaStore.getState().importTables(tables, rels, allowGuestEdits);
      } catch (e) {
        console.warn('[Yjs] Failed to apply remote schema:', e);
      } finally {
        get().setApplyingRemote(false);
      }
    });

    // ── Zustand → Yjs  (local edits go out) ──────────────────────────────
    let lastTablesJson = '';
    let lastRelsJson = '';
    let lastAllowGuestEditsJson = '';
    
    const unsub = useSchemaStore.subscribe((state) => {
      // Ignore if we are currently handling incoming remote changes
      if (get().isApplyingRemote) return;
      
      // CRITICAL ZERO-TRUST PATCH: If this local client is in View-Only mode,
      // physically block all outgoing structural modifications from being broadcasted
      // to the Yjs doc. This guarantees Guests cannot hack their schema remotely.
      if (useUIStore.getState().readOnly) return;
      
      const tablesJson = JSON.stringify(state.tables);
      const relsJson   = JSON.stringify(state.relationships);
      const allowGuestEditsJson = JSON.stringify(state.allowGuestEdits);
      
      // Only broadcast if the actual schema payload changed
      if (tablesJson === lastTablesJson && relsJson === lastRelsJson && allowGuestEditsJson === lastAllowGuestEditsJson) return;
      
      lastTablesJson = tablesJson;
      lastRelsJson = relsJson;
      lastAllowGuestEditsJson = allowGuestEditsJson;
      
      const ySchemaMap = doc.getMap<string>('schema');
      doc.transact(() => {
        ySchemaMap.set('tables',        tablesJson);
        ySchemaMap.set('relationships', relsJson);
        ySchemaMap.set('allowGuestEdits', allowGuestEditsJson);
      });
    });

    provider.on('status', ({ status }: { status: string }) => {
      set({ connected: status === 'connected' });
    });

    // Stash unsubscribe for leaveRoom cleanup
    (provider as any)._schemaUnsub = unsub;

    set({ roomId, doc, provider, connected: false });

    // Seed Yjs with current local schema immediately
    const { tables, relationships, allowGuestEdits } = useSchemaStore.getState();
    if (tables.length > 0) {
      doc.transact(() => {
        ySchema.set('tables',        JSON.stringify(tables));
        ySchema.set('relationships', JSON.stringify(relationships));
        ySchema.set('allowGuestEdits', JSON.stringify(allowGuestEdits));
      });
    }
  },

  leaveRoom: (clearUrl = true) => {
    const { provider, doc } = get();
    if (provider) {
      (provider as any)._schemaUnsub?.();
      provider.disconnect();
      provider.destroy();
    }
    if (doc) doc.destroy();
    if (clearUrl) clearRoomFromURL();
    set({ roomId: null, connected: false, collaborators: [], doc: null, provider: null });
  },

  broadcastCursor: (x: number, y: number) => {
    // Prevent View-Only guests from distracting the Host with their cursor
    if (useUIStore.getState().readOnly) return;

    const { provider } = get();
    if (!provider) return;
    const current = provider.awareness.getLocalState();
    provider.awareness.setLocalStateField('user', {
      ...(current as any)?.user,
      cursor: { x, y },
    });
  },

  clearCursor: () => {
    const { provider } = get();
    if (!provider) return;
    const current = provider.awareness.getLocalState();
    provider.awareness.setLocalStateField('user', {
      ...(current as any)?.user,
      cursor: null,
    });
  },
}));

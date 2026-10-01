/**
 * Local project storage.
 *
 * Projects live entirely in the user's browser (IndexedDB). Nothing is sent to a server.
 * If IndexedDB is unavailable (some private-browsing modes, locked-down browsers) we fall
 * back to an in-memory map so the app keeps working for the session, and `storageMode()`
 * reports 'memory' so the UI can warn that work will not survive a reload.
 */
import type { Table, Relationship, Note, Group, Snapshot } from '../types/schema';
import { sanitizeCanvasState } from './sanitizeSchema';

export interface CanvasState {
  tables: Table[];
  relationships: Relationship[];
  notes?: Note[];
  groups?: Group[];
}

export interface Project {
  id: string;
  name: string;
  canvas_state: CanvasState | null;
  snapshots?: Snapshot[];
  created_at: string;
  updated_at: string;
}

export type StorageMode = 'indexeddb' | 'memory';

const DB_NAME = 'modellr';
const STORE = 'projects';

const memory = new Map<string, Project>();
let dbPromise: Promise<IDBDatabase | null> | null = null;
let mode: StorageMode = 'indexeddb';

function openDB(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      mode = 'memory';
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { mode = 'memory'; resolve(null); };
      req.onblocked = () => { mode = 'memory'; resolve(null); };
    } catch {
      mode = 'memory';
      resolve(null);
    }
  });
  return dbPromise;
}

export function storageMode(): StorageMode {
  return mode;
}

/** Test hook: drop the cached connection and in-memory data. */
export function __resetForTests() {
  memory.clear();
  dbPromise = null;
  mode = 'indexeddb';
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function putRaw(project: Project): Promise<void> {
  const db = await openDB();
  if (!db) { memory.set(project.id, project); return; }
  const tx = db.transaction(STORE, 'readwrite');
  await request(tx.objectStore(STORE).put(project));
}

export async function listProjects(): Promise<Project[]> {
  const db = await openDB();
  let all: Project[];
  if (!db) {
    all = Array.from(memory.values());
  } else {
    all = await request<Project[]>(db.transaction(STORE, 'readonly').objectStore(STORE).getAll());
  }
  return all.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await openDB();
  if (!db) return memory.get(id) ?? null;
  const p = await request<Project | undefined>(db.transaction(STORE, 'readonly').objectStore(STORE).get(id));
  return p ?? null;
}

export async function createProject(input: { name?: string; canvas_state?: CanvasState | null; snapshots?: Snapshot[] } = {}): Promise<Project> {
  const now = new Date().toISOString();
  const project: Project = {
    id: newId(),
    name: input.name?.trim() || 'Untitled schema',
    canvas_state: input.canvas_state ?? null,
    snapshots: input.snapshots ?? [],
    created_at: now,
    updated_at: now,
  };
  await putRaw(project);
  return project;
}

/** Merge a patch into an existing project. Returns null when the project no longer exists. */
export async function saveProject(
  id: string,
  patch: Partial<Pick<Project, 'name' | 'canvas_state' | 'snapshots'>>,
): Promise<Project | null> {
  const existing = await getProject(id);
  if (!existing) return null;
  const next: Project = { ...existing, ...patch, id, updated_at: new Date().toISOString() };
  await putRaw(next);
  return next;
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDB();
  if (!db) { memory.delete(id); return; }
  await request(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id));
}

export async function duplicateProject(id: string): Promise<Project | null> {
  const src = await getProject(id);
  if (!src) return null;
  return createProject({
    name: `${src.name} (Copy)`,
    canvas_state: src.canvas_state ? JSON.parse(JSON.stringify(src.canvas_state)) : null,
  });
}

// ── Backup / restore ─────────────────────────────────────────────────────────

const BACKUP_FORMAT = 'modellr-backup';

export async function exportAllProjectsJson(): Promise<string> {
  const projects = await listProjects();
  return JSON.stringify({ format: BACKUP_FORMAT, version: 1, exported_at: new Date().toISOString(), projects }, null, 2);
}


/**
 * Import either a full backup (from exportAllProjectsJson) or a single project / canvas state
 * (as produced by the per-project "Export" button). Imported projects always get fresh ids so
 * they can never overwrite existing work. Returns the number of projects created.
 */
export async function importProjectsJson(text: string): Promise<number> {
  let data: Record<string, unknown>;
  try { data = JSON.parse(text) as Record<string, unknown>; } catch { throw new Error('That file is not valid JSON.'); }

  const candidates: { name: string; canvas_state: CanvasState; snapshots?: Snapshot[] }[] = [];
  const add = (name: unknown, raw: unknown, snapshots?: unknown) => {
    const canvas_state = sanitizeCanvasState(raw);
    if (!canvas_state) return;
    candidates.push({
      name: typeof name === 'string' && name.trim() ? name : 'Imported schema',
      canvas_state,
      snapshots: Array.isArray(snapshots) ? (snapshots as Snapshot[]).filter((s) => sanitizeCanvasState(s)) : [],
    });
  };

  if (data && data.format === BACKUP_FORMAT && Array.isArray(data.projects)) {
    for (const p of data.projects as Record<string, unknown>[]) add(p?.name, p?.canvas_state, p?.snapshots);
  } else if (data && typeof data === 'object' && data.canvas_state) {
    add(data.name, data.canvas_state, data.snapshots);
  } else {
    add('Imported schema', data);
  }

  if (candidates.length === 0) throw new Error('No schemas found in that file.');
  for (const c of candidates) await createProject(c);
  return candidates.length;
}

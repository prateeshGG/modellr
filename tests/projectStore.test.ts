import { describe, it, expect, beforeEach } from 'vitest';
import {
  __resetForTests,
  createProject,
  deleteProject,
  duplicateProject,
  exportAllProjectsJson,
  getProject,
  importProjectsJson,
  listProjects,
  saveProject,
  storageMode,
} from '../src/lib/projectStore';

// Node has no IndexedDB, so these tests exercise the in-memory fallback path.
const state = { tables: [{ id: 't1', name: 'users', fields: [], position: { x: 0, y: 0 }, accentColor: 'blue' }], relationships: [] } as any;

describe('projectStore', () => {
  beforeEach(() => __resetForTests());

  it('creates, reads and lists projects, newest first', async () => {
    const a = await createProject({ name: 'A' });
    await new Promise((r) => setTimeout(r, 5));
    const b = await createProject({ name: 'B', canvas_state: state });
    expect(storageMode()).toBe('memory');
    expect((await getProject(b.id))?.canvas_state?.tables).toHaveLength(1);
    expect((await listProjects()).map((p) => p.name)).toEqual(['B', 'A']);
    expect(a.id).not.toBe(b.id);
  });

  it('defaults the name and trims input', async () => {
    expect((await createProject({ name: '   ' })).name).toBe('Untitled schema');
    expect((await createProject({ name: '  x ' })).name).toBe('x');
  });

  it('saveProject merges, bumps updated_at, and returns null for deleted projects', async () => {
    const p = await createProject({ name: 'A' });
    await new Promise((r) => setTimeout(r, 5));
    const saved = await saveProject(p.id, { name: 'A2', canvas_state: state });
    expect(saved?.name).toBe('A2');
    expect(saved!.updated_at > p.updated_at).toBe(true);
    expect(saved?.created_at).toBe(p.created_at);

    await deleteProject(p.id);
    expect(await saveProject(p.id, { name: 'ghost' })).toBeNull();
    expect(await getProject(p.id)).toBeNull();
  });

  it('duplicate makes an independent deep copy', async () => {
    const p = await createProject({ name: 'A', canvas_state: state });
    const copy = await duplicateProject(p.id);
    expect(copy?.name).toBe('A (Copy)');
    copy!.canvas_state!.tables[0].name = 'changed';
    expect((await getProject(p.id))?.canvas_state?.tables[0].name).toBe('users');
  });

  it('round-trips a full backup with fresh ids', async () => {
    const p = await createProject({ name: 'A', canvas_state: state });
    const json = await exportAllProjectsJson();
    const n = await importProjectsJson(json);
    expect(n).toBe(1);
    const all = await listProjects();
    expect(all).toHaveLength(2);
    expect(new Set(all.map((x) => x.id)).size).toBe(2);
    expect(all.some((x) => x.id === p.id)).toBe(true);
  });

  it('imports a single exported canvas state and rejects junk', async () => {
    expect(await importProjectsJson(JSON.stringify(state))).toBe(1);
    expect(await importProjectsJson(JSON.stringify({ name: 'X', canvas_state: state }))).toBe(1);
    await expect(importProjectsJson('not json')).rejects.toThrow(/valid JSON/);
    await expect(importProjectsJson('{"hello":1}')).rejects.toThrow(/No schemas/);
  });
});

import { sanitizeCanvasState } from '../src/lib/sanitizeSchema';

describe('sanitizeCanvasState', () => {
  it('rejects non-schema input', () => {
    expect(sanitizeCanvasState(null)).toBeNull();
    expect(sanitizeCanvasState({})).toBeNull();
    expect(sanitizeCanvasState({ tables: 'nope' })).toBeNull();
  });

  it('repairs malformed tables instead of crashing the canvas', () => {
    const out = sanitizeCanvasState({
      tables: [
        { id: 'a', name: 'users' },                                   // no fields, no position
        { id: 'a', name: 'dup-id', fields: [{ id: 'x' }, null, 5], position: { x: 'z' } },
        'garbage',
      ],
    })!;
    expect(out.tables).toHaveLength(2);
    expect(out.tables[0].fields).toEqual([]);
    expect(new Set(out.tables.map((t) => t.id)).size).toBe(2);
    expect(Number.isFinite(out.tables[1].position.x)).toBe(true);
    expect(out.tables[1].fields).toHaveLength(1);
    expect(out.tables[1].fields[0].type).toBe('text');
  });

  it('drops relationships with missing endpoints and bad cardinality is repaired', () => {
    const out = sanitizeCanvasState({
      tables: [
        { id: 't1', name: 'a', fields: [{ id: 'f1', name: 'id' }] },
        { id: 't2', name: 'b', fields: [{ id: 'f2', name: 'a_id' }] },
      ],
      relationships: [
        { id: 'r1', sourceTableId: 't2', sourceFieldId: 'f2', targetTableId: 't1', targetFieldId: 'f1', cardinality: 'weird' },
        { id: 'r2', sourceTableId: 't2', sourceFieldId: 'nope', targetTableId: 't1', targetFieldId: 'f1' },
      ],
    })!;
    expect(out.relationships).toHaveLength(1);
    expect(out.relationships[0].cardinality).toBe('one-to-many');
  });
});

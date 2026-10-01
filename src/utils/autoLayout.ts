import ELKApi from 'elkjs/lib/elk-api.js';
import elkWorkerUrl from 'elkjs/lib/elk-worker.min.js?url';
import type { Table, Relationship, Density } from '../types/schema';

type ElkLike = { layout: (graph: any) => Promise<any> };

let elk: ElkLike | null = null;
let useFallback = false;

/**
 * Layout runs in a Web Worker so a large schema doesn't freeze the page (the main-thread
 * version blocked for ~4s at 1,000 tables). If the worker can't start (blocked by a strict
 * CSP, unsupported environment) we fall back to the bundled main-thread build.
 */
async function runLayout(graph: unknown) {
  if (!useFallback) {
    try {
      elk ??= new ELKApi({ workerUrl: elkWorkerUrl }) as ElkLike;
      return await elk.layout(graph);
    } catch (err) {
      console.warn('[auto-layout] worker unavailable, falling back to main thread:', err);
      useFallback = true;
      elk = null;
    }
  }
  const { default: ELKBundled } = await import('elkjs/lib/elk.bundled.js');
  elk ??= new ELKBundled() as ElkLike;
  return elk.layout(graph);
}

interface LayoutNode {
  id: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
}

/** Estimate node height based on field count and density */
function estimateNodeHeight(table: Table, density: Density): number {
  const headerH = 40;
  const footerH = 28 + 24; // add-field + ai-chip
  const fieldH = density === 'compact' ? 28 : (density === 'spacious' ? 36 : 32); 
  return headerH + table.fields.length * fieldH + footerH;
}

export async function autoLayout(
  tables: Table[],
  relationships: Relationship[],
  density: Density = 'comfortable'
): Promise<Map<string, { x: number; y: number }>> {
  const nodeWidth = 240;

  const nodes: LayoutNode[] = tables.map((t) => ({
    id: t.id,
    width: nodeWidth,
    height: estimateNodeHeight(t, density),
  }));

  const edges = relationships.map((r) => ({
    id: r.id,
    sources: [r.sourceTableId],
    targets: [r.targetTableId],
  }));

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '60',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'elk.layered.nodePlacement.strategy': 'SIMPLE',
      'elk.padding': '[top=40, left=40, bottom=40, right=40]',
    },
    children: nodes,
    edges,
  };

  try {
    const laid = await runLayout(graph);
    const positions = new Map<string, { x: number; y: number }>();

    for (const child of laid.children ?? []) {
      if (child.x !== undefined && child.y !== undefined) {
        positions.set(child.id, { x: child.x, y: child.y });
      }
    }
    return positions;
  } catch (err) {
    console.error('[auto-layout] ELK error:', err);
    return new Map();
  }
}

import ELK from 'elkjs/lib/elk.bundled.js';
import type { Table, Relationship, Density } from '../types/schema';

const elk = new ELK();

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
    const laid = await elk.layout(graph as any);
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

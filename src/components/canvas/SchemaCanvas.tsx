import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  Controls,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { TableNode } from './TableNode';
import NoteNode from './NoteNode';
import GroupNode from './GroupNode';
import { RelationshipEdge, RelationshipMarkerDefs } from './RelationshipEdge';
import { EmptyState } from './EmptyState';
import { useSchemaStore } from '../../store/schema';
import { useUIStore } from '../../store/ui';
import { CANVAS_SNAP_GRID, ACCENT_HEX, PILL_NODE_ZOOM_THRESHOLD } from '../../utils/constants';
import { autoLayout } from '../../utils/autoLayout';
import type { Table, Relationship, Note, Group } from '../../types/schema';
import './SchemaCanvas.css';

const nodeTypes = { tableNode: TableNode, noteNode: NoteNode, groupNode: GroupNode };
const edgeTypes = { relationshipEdge: RelationshipEdge };

function tableToNode(table: Table): Node {
  return {
    id: table.id,
    type: 'tableNode',
    position: table.position,
    parentId: table.groupId,
    data: { ...table } as unknown as Record<string, unknown>,
    dragHandle: '.table-node__header',
  };
}

function noteToNode(note: Note): Node {
  return {
    id: note.id,
    type: 'noteNode',
    position: note.position,
    data: { ...note } as unknown as Record<string, unknown>,
  };
}

function groupToNode(group: Group): Node {
  return {
    id: group.id,
    type: 'groupNode',
    position: group.position,
    data: { ...group } as unknown as Record<string, unknown>,
    style: { width: group.width, height: group.height, zIndex: -1 },
  };
}

// Build a lightweight {id -> position} map that updates live during drag
type PositionMap = Map<string, { x: number; y: number }>;

/** Use the centre of a ~300px wide node to decide which side of each table the edge attaches to. */
function isSourceLeftOf(rel: Relationship, positions: PositionMap): boolean {
  const sourceX = (positions.get(rel.sourceTableId)?.x ?? 0) + 150;
  const targetX = (positions.get(rel.targetTableId)?.x ?? 0) + 150;
  return sourceX <= targetX;
}

function relationshipToEdge(rel: Relationship, isSourceLeftOfTarget: boolean): Edge {

  // React Flow edges must always flow from a 'source' handle (right side) to a 'target' handle (left side).
  // Our FieldRow only renders type="source" on the right, and type="target" on the left.
  // So if the logical target table is dragged to the left of the logical source table,
  // we must swap the React Flow edge direction and apply the crowsfoot marker to the start instead of end.
  const edgeSourceTableId = isSourceLeftOfTarget ? rel.sourceTableId : rel.targetTableId;
  const edgeTargetTableId = isSourceLeftOfTarget ? rel.targetTableId : rel.sourceTableId;
  const edgeSourceFieldId = isSourceLeftOfTarget ? rel.sourceFieldId : rel.targetFieldId;
  const edgeTargetFieldId = isSourceLeftOfTarget ? rel.targetFieldId : rel.sourceFieldId;

  const marker = rel.cardinality !== 'one-to-one' ? 'url(#crowsfoot-many)' : 'url(#crowsfoot-one)';

  return {
    id: rel.id,
    source: edgeSourceTableId,
    target: edgeTargetTableId,
    sourceHandle: `${edgeSourceTableId}__${edgeSourceFieldId}__right`,
    targetHandle: `${edgeTargetTableId}__${edgeTargetFieldId}__left`,
    type: 'relationshipEdge',
    // zIndex 0 ensures edges render BEHIND table node cards at all times
    zIndex: 0,
    markerEnd: isSourceLeftOfTarget ? marker : undefined,
    markerStart: !isSourceLeftOfTarget ? marker : undefined,
    data: {
      sourceTableId: rel.sourceTableId,
      cardinality: rel.cardinality,
    } as unknown as Record<string, unknown>,
  };
}

type NodeSource = Table | Note | Group;

function CanvasInner() {
  // Subscribe to individual slices. Destructuring the whole store re-rendered the entire canvas
  // on every unrelated change (autosave flags, project rename, ...).
  const tables = useSchemaStore((s) => s.tables);
  const relationships = useSchemaStore((s) => s.relationships);
  const notes = useSchemaStore((s) => s.notes);
  const groups = useSchemaStore((s) => s.groups);
  const addRelationship = useSchemaStore((s) => s.addRelationship);
  const moveTables = useSchemaStore((s) => s.moveTables);
  const updateNote = useSchemaStore((s) => s.updateNote);
  const addNote = useSchemaStore((s) => s.addNote);
  const addGroup = useSchemaStore((s) => s.addGroup);
  const updateGroup = useSchemaStore((s) => s.updateGroup);
  const updateTable = useSchemaStore((s) => s.updateTable);
  const removeTable = useSchemaStore((s) => s.removeTable);
  const setZoom = useUIStore((s) => s.setZoom);
  const zoom = useUIStore((s) => s.zoom);
  const density = useUIStore((s) => s.density);
  const showToast = useUIStore((s) => s.showToast);
  const setSelection = useUIStore((s) => s.setSelection);
  const clearSelection = useUIStore((s) => s.clearSelection);
  const readOnly = useUIStore((s) => s.readOnly);
  const { screenToFlowPosition, fitView, setViewport, getViewport, getIntersectingNodes } = useReactFlow();
  const isRunningLayout = useRef(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Rebuild the node list, but keep the existing node object for every table/note/group whose
  // source object is unchanged. The store is immutable, so identity equality means "unchanged",
  // and React Flow can then skip re-rendering that node (and keeps its measured size/selection).
  // Without this, editing one field re-rendered every table on the canvas.
  const nodeSources = useRef(new Map<string, NodeSource>());
  useEffect(() => {
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));
      const sources = new Map<string, NodeSource>();
      const build = <T extends NodeSource>(items: T[], toNode: (item: T) => Node): Node[] =>
        items.map((item) => {
          sources.set(item.id, item);
          const old = prevById.get(item.id);
          if (old && nodeSources.current.get(item.id) === item) return old;
          const fresh = toNode(item);
          return old ? { ...fresh, selected: old.selected, measured: old.measured } : fresh;
        });
      const next = [...build(groups, groupToNode), ...build(tables, tableToNode), ...build(notes, noteToNode)];
      nodeSources.current = sources;
      return next;
    });
  }, [tables, notes, groups, setNodes]);

  // Derive a position map from the LIVE React Flow node state (not Zustand).
  // This updates on every drag frame, so edges recalculate in real-time and
  // never point at stale handles — fixing the "lines disappear when moved" bug.
  const livePositions = useMemo<PositionMap>(() => {
    const map: PositionMap = new Map();
    nodes.forEach(n => map.set(n.id, n.position));
    return map;
  }, [nodes]);

  // An edge only changes when its relationship changes or when the table it attaches to flips
  // sides, so reuse the previous edge object otherwise (most frames of a drag change none).
  const edgeCache = useRef(new Map<string, { rel: Relationship; leftOf: boolean; edge: Edge }>());
  useEffect(() => {
    const cache = new Map<string, { rel: Relationship; leftOf: boolean; edge: Edge }>();
    const next = relationships.map((rel) => {
      const leftOf = isSourceLeftOf(rel, livePositions);
      const hit = edgeCache.current.get(rel.id);
      const entry = hit && hit.rel === rel && hit.leftOf === leftOf
        ? hit
        : { rel, leftOf, edge: relationshipToEdge(rel, leftOf) };
      cache.set(rel.id, entry);
      return entry.edge;
    });
    edgeCache.current = cache;
    setEdges(next);
  }, [relationships, livePositions, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      if (!connection.source || !connection.target ||
          !connection.sourceHandle || !connection.targetHandle) return;

      try {
        // Handle ID format: "tableId__fieldId__left" or "tableId__fieldId__right"
        const sourceParts = connection.sourceHandle.split('__');
        const targetParts = connection.targetHandle.split('__');
        const sourceFieldId = sourceParts[1];
        const targetFieldId = targetParts[1];

        if (!sourceFieldId || !targetFieldId) return;

        addRelationship({
          sourceTableId: connection.source,
          sourceFieldId,
          targetTableId: connection.target,
          targetFieldId,
          cardinality: 'one-to-many',
        });
      } catch (e) {
        console.error('[Canvas] Failed to create relationship:', e);
      }
    },
    [addRelationship, readOnly]
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (readOnly) return;
      
      if (node.type === 'tableNode') {
        const intersections = getIntersectingNodes(node).filter((n) => n.type === 'groupNode');
        const targetGroup = intersections.length > 0 ? intersections[0] : null;

        if (targetGroup) {
          // Dropped over a group -> assign to group
          // React Flow's node.position is relative to the parent if it has one, or absolute if it doesn't.
          // To ensure stable parenting, we capture the absolute position of the table and the absolute position of the group,
          // then compute the relative offset locally.
          // React Flow calculates absolute positions during drags, available on internally typed nodes
          const tableAbsPos = (node as any).computed?.positionAbsolute || (node as any).positionAbsolute || node.position;
          const groupAbsPos = (targetGroup as any).computed?.positionAbsolute || (targetGroup as any).positionAbsolute || targetGroup.position;
          
          const relativePos = {
            x: tableAbsPos.x - groupAbsPos.x,
            y: tableAbsPos.y - groupAbsPos.y
          };
          updateTable(node.id, { position: relativePos, groupId: targetGroup.id });
        } else {
          // Dropped outside -> remove from group and restore absolute position
          const tableAbsPos = (node as any).computed?.positionAbsolute || (node as any).positionAbsolute || node.position;
          updateTable(node.id, { position: tableAbsPos, groupId: undefined });
        }
      } else if (node.type === 'noteNode') {
        updateNote(node.id, { position: node.position });
      } else if (node.type === 'groupNode') {
        updateGroup(node.id, { position: node.position });
      }
    },
    [updateTable, updateNote, updateGroup, getIntersectingNodes, readOnly]
  );

  const onPaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // ── Edge click → select relationship in RightPanel ──
  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelection({ type: 'relationship', relationshipId: edge.id });
    },
    [setSelection]
  );

  // ── Multi-select: track selected node IDs for bulk delete ──
  const selectedNodeIds = useRef<string[]>([]);
  const onSelectionChange = useCallback(
    ({ nodes }: { nodes: Node[] }) => {
      selectedNodeIds.current = nodes.map((n) => n.id);
    },
    []
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (readOnly) return;
      const target = e.target as HTMLElement;
      if (
        !target.closest('.react-flow__node') &&
        !target.closest('.react-flow__panel') &&
        !target.closest('.react-flow__controls')
      ) {
        const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        useSchemaStore.getState().addTable(pos);
      }
    },
    [screenToFlowPosition, readOnly]
  );

  // ── Auto-layout handler ──────────────────────────
  const handleAutoLayout = useCallback(async () => {
    const ungroupedTables = tables.filter(t => !t.groupId);
    const ungroupedTableIds = new Set(ungroupedTables.map(t => t.id));
    const ungroupedRels = relationships.filter(r => 
      ungroupedTableIds.has(r.sourceTableId) && ungroupedTableIds.has(r.targetTableId)
    );

    if (isRunningLayout.current || ungroupedTables.length === 0) return;
    isRunningLayout.current = true;

    try {
      const positions = await autoLayout(ungroupedTables, ungroupedRels, density ?? 'comfortable');
      moveTables(positions);
      setTimeout(() => fitView({ padding: 0.12, duration: 400 }), 100);
      if (showToast) showToast('Auto-layout applied', 'success');
    } catch {
      if (showToast) showToast('Auto-layout failed', 'error');
    } finally {
      isRunningLayout.current = false;
    }
  }, [tables, relationships, density, moveTables, fitView, showToast]);

  const handleAddNote = useCallback(() => {
    if (readOnly) return;
    const { x, y, zoom } = getViewport();
    // Spawn in the center of the current viewport
    const centerX = -x / zoom + window.innerWidth / (2 * zoom) - 100;
    const centerY = -y / zoom + window.innerHeight / (2 * zoom) - 75;
    addNote({ x: centerX, y: centerY });
  }, [getViewport, addNote, readOnly]);

  const handleAddGroup = useCallback(() => {
    if (readOnly) return;
    const { x, y, zoom } = getViewport();
    // Spawn in the center
    const centerX = -x / zoom + window.innerWidth / (2 * zoom) - 150;
    const centerY = -y / zoom + window.innerHeight / (2 * zoom) - 150;
    addGroup({ x: centerX, y: centerY });
  }, [getViewport, addGroup, readOnly]);

  // ── Custom event listeners (keyboard shortcuts → canvas) ──
  useEffect(() => {
    const onAutoLayout = () => handleAutoLayout();
    const onFitView = () => fitView({ padding: 0.12, duration: 300 });
    const onZoomPreset = (e: Event) => {
      const level = (e as CustomEvent).detail as number;
      const zoomMap: Record<number, number> = { 1: 0.25, 2: 0.5, 3: 1, 4: 1.5, 5: 2 };
      const z = zoomMap[level] ?? 1;
      setViewport({ x: 0, y: 0, zoom: z }, { duration: 200 });
      setZoom(z);
    };
    const onFocusFilter = () => {
      document.querySelector<HTMLInputElement>('.sidebar__filter')?.focus();
    };
    // sf:focus-table — pan canvas to a specific table node
    const onFocusTable = (e: Event) => {
      const tableId = (e as CustomEvent).detail as string;
      const node = tables.find((t) => t.id === tableId);
      if (!node) return;
      fitView({ nodes: [{ id: tableId }], padding: 0.3, duration: 400, maxZoom: 1.5 });
    };
    // sf:bulk-delete — delete all currently selected nodes by type
    const onBulkDelete = () => {
      const ids = selectedNodeIds.current;
      if (ids.length === 0) return;
      // Fix #21: dispatch correct removal per node type
      ids.forEach((id) => {
        const tableMatch = tables.find(t => t.id === id);
        if (tableMatch) { removeTable(id); return; }
        const noteMatch = notes.find(n => n.id === id);
        if (noteMatch) { useSchemaStore.getState().removeNote(id); return; }
        const groupMatch = groups.find(g => g.id === id);
        if (groupMatch) { useSchemaStore.getState().removeGroup(id); }
      });
      clearSelection();
      selectedNodeIds.current = [];
    };

    window.addEventListener('sf:auto-layout', onAutoLayout);
    window.addEventListener('sf:fit-view', onFitView);
    window.addEventListener('sf:zoom-preset', onZoomPreset);
    window.addEventListener('sf:focus-filter', onFocusFilter);
    window.addEventListener('sf:focus-table', onFocusTable);
    window.addEventListener('sf:bulk-delete', onBulkDelete);

    return () => {
      window.removeEventListener('sf:auto-layout', onAutoLayout);
      window.removeEventListener('sf:fit-view', onFitView);
      window.removeEventListener('sf:zoom-preset', onZoomPreset);
      window.removeEventListener('sf:focus-filter', onFocusFilter);
      window.removeEventListener('sf:focus-table', onFocusTable);
      window.removeEventListener('sf:bulk-delete', onBulkDelete);
    };
  }, [handleAutoLayout, fitView, setViewport, setZoom, tables, removeTable, clearSelection]);

  const isPillMode = zoom < PILL_NODE_ZOOM_THRESHOLD;
  // Only create new node objects when the class actually has to change.
  const displayNodes = useMemo(
    () => (isPillMode ? nodes.map((n) => ({ ...n, className: 'table-node--pill' })) : nodes),
    [nodes, isPillMode],
  );

  return (
    <div
      className="schema-canvas"
      role="application"
      aria-label="Schema canvas"
      // Capture phase: React Flow's zoom layer stops the event before it can bubble to this div.
      onDoubleClickCapture={onDoubleClick}
    >
      <RelationshipMarkerDefs />
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        onEdgeClick={onEdgeClick}
        onSelectionChange={onSelectionChange}
        onMoveEnd={(_, viewport) => setZoom(viewport.zoom)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable
        connectionMode={'loose' as any}
        snapToGrid
        snapGrid={CANVAS_SNAP_GRID}
        minZoom={0.1}
        maxZoom={4}
        fitView
        // Don't blow a single small table up to 400% when it is the first thing on the canvas.
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        zoomOnDoubleClick={false}
        onlyRenderVisibleElements
        multiSelectionKeyCode="Shift"
        deleteKeyCode={null} // We handle delete ourselves
        proOptions={{ hideAttribution: true }}
        isValidConnection={(conn) => conn.source !== conn.target}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="var(--text-muted)"
          style={{ opacity: 0.08 }}
        />
        <MiniMap
          nodeColor={(node) => {
            const tbl = tables.find((t) => t.id === node.id);
            return tbl ? ACCENT_HEX[tbl.accentColor] : '#888';
          }}
          maskColor="var(--canvas-bg)"
          style={{
            background: 'var(--surface-low)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--r-lg)',
          }}
        />

        {/* Canvas toolbar */}
        <Panel position="bottom-left" style={{ bottom: 8, left: 8 }}>
          <div className="canvas-toolbar">
            <button
              className="canvas-toolbar__btn"
              onClick={handleAddNote}
              title="Add Sticky Note"
              aria-label="Add Sticky Note"
              disabled={readOnly}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              Note
            </button>
            <button
              className="canvas-toolbar__btn"
              onClick={handleAddGroup}
              title="Add Table Group"
              aria-label="Add Table Group"
              disabled={readOnly}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
              Group
            </button>
            <div style={{ width: '1px', background: 'var(--border-default)', margin: '0 4px', height: '16px' }} />
            <button
              className="canvas-toolbar__btn"
              onClick={handleAutoLayout}
              title="Auto-layout (G)"
              aria-label="Auto-layout"
            >
              ⊞ Layout
            </button>
            <button
              className="canvas-toolbar__btn"
              onClick={() => fitView({ padding: 0.12, duration: 300 })}
              title="Fit view (0)"
              aria-label="Fit to view"
            >
              ⤢ Fit
            </button>
          </div>
        </Panel>

        <Controls 
          position="bottom-center"
          style={{ 
            display: 'flex', 
            flexDirection: 'row', 
            background: 'var(--surface-base)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            overflow: 'hidden',
            margin: '0 0 16px 0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}
          className="canvas-controls-dark"
          showInteractive={false}
        />

        {tables.length === 0 && <EmptyState />}
      </ReactFlow>
    </div>
  );
}

export function SchemaCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}

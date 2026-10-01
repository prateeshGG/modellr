import React, { useEffect, useMemo, useRef } from 'react';
import { 
  ReactFlow, 
  Background, 
  BackgroundVariant, 
  ReactFlowProvider 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TEMPLATES } from '../../utils/templates';
import { TableNode } from '../canvas/TableNode';
import { RelationshipEdge, RelationshipMarkerDefs } from '../canvas/RelationshipEdge';
import '../canvas/SchemaCanvas.css';
import { IconClose } from '../site/icons';

interface TemplatePreviewModalProps {
  templateId: string;
  onClose: () => void;
  onUse: () => void;
}

const nodeTypes = { tableNode: TableNode };
const edgeTypes = { relationshipEdge: RelationshipEdge };

const PreviewInner: React.FC<TemplatePreviewModalProps> = ({ templateId, onClose, onUse }) => {
  const template = TEMPLATES[templateId];
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape closes; focus moves into the dialog and returns to the trigger afterwards.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [onClose]);

  // Fix #24: guard BEFORE any hooks to avoid violating the Rules of Hooks
  // (hooks must not be called after a conditional return)
  const nodes = useMemo(() => {
    if (!template) return [];
    return (template.tables || []).map(t => ({
      id: t.id,
      type: 'tableNode',
      position: t.position,
      data: { ...t }
    }));
  }, [template]);

  const edges = useMemo(() => {
    if (!template) return [];
    return (template.relationships || []).map(r => {
      // Fix #25: use the canonical handle format tableId__fieldId__side
      // that matches what FieldRow renders so edges connect properly
      return {
        id: r.id,
        source: r.sourceTableId,
        target: r.targetTableId,
        sourceHandle: `${r.sourceTableId}__${r.sourceFieldId}__right`,
        targetHandle: `${r.targetTableId}__${r.targetFieldId}__left`,
        type: 'relationshipEdge',
        zIndex: 0,
        data: { sourceTableId: r.sourceTableId, cardinality: r.cardinality },
        markerEnd: r.cardinality !== 'one-to-one' ? 'url(#crowsfoot-many)' : 'url(#crowsfoot-one)',
      };
    });
  }, [template]);

  if (!template) return null;

  return (
    <div className="n-scrim" onClick={onClose}>
      <div ref={dialogRef} className="n-modal n-modal--wide" role="dialog" aria-modal="true" aria-labelledby="tpl-preview-title" onClick={(e) => e.stopPropagation()}>
        <div className="n-modal__head">
          <div>
            <h2 id="tpl-preview-title" className="n-h3">{template.label}</h2>
            <span className="n-card__meta">{template.tables.length} tables · {template.description}</span>
          </div>
          <button type="button" className="n-icon-btn" onClick={onClose} aria-label="Close preview"><IconClose /></button>
        </div>
        <div className="n-preview">
          <RelationshipMarkerDefs />
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="var(--text-muted)" style={{ opacity: 0.08 }} />
          </ReactFlow>
        </div>
        <div className="n-modal__foot">
          <button type="button" className="n-btn n-btn--secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="n-btn" onClick={onUse}>Use this template</button>
        </div>
      </div>
    </div>
  );
};

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = (props) => (
  <ReactFlowProvider>
    <PreviewInner {...props} />
  </ReactFlowProvider>
);

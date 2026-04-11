import React, { useMemo } from 'react';
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

interface TemplatePreviewModalProps {
  templateId: string;
  onClose: () => void;
  onUse: () => void;
}

const nodeTypes = { tableNode: TableNode };
const edgeTypes = { relationshipEdge: RelationshipEdge };

const PreviewInner: React.FC<TemplatePreviewModalProps> = ({ templateId, onClose, onUse }) => {
  const template = TEMPLATES[templateId];

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
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="preview-header">
          <div>
            <h2 style={{ margin: 0, fontSize: '20px' }}>{template.label} Preview</h2>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{template.description}</div>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </header>

        <div className="preview-canvas-wrapper">
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
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={24} 
              size={1.5} 
              color="var(--text-muted)" 
              style={{ opacity: 0.08 }} 
            />
          </ReactFlow>
        </div>

        <footer className="preview-footer">
          <div style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '14px' }}>
             Start with this {template.tables.length}-table architecture.
          </div>
          <button 
            className="btn-primary" 
            onClick={onUse}
            style={{ padding: '12px 32px' }}
          >
            Use Template
          </button>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer' }}
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = (props) => (
  <ReactFlowProvider>
    <PreviewInner {...props} />
  </ReactFlowProvider>
);

import React, { useCallback, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Field } from '../../types/schema';
import { useSchemaStore } from '../../store/schema';
import { useUIStore } from '../../store/ui';
import { FIELD_TYPES_BY_DIALECT } from '../../utils/constants';
import type { Dialect } from '../../types/schema';
import './FieldRow.css';

interface FieldRowProps {
  tableId: string;
  field: Field;
  index: number;
  // Fix #63: removed unused 'totalFields' prop
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: () => void;
  isDragging: boolean;
  isDropTarget: boolean;
  readOnly?: boolean;
}

export const FieldRow: React.FC<FieldRowProps> = React.memo(({
  tableId, field, index, onDragStart, onDragOver, onDrop, isDragging, isDropTarget, readOnly,
}) => {
  const updateField = useSchemaStore((s) => s.updateField);
  const dialect = useSchemaStore((s) => s.dialect);
  const isEditing = useUIStore((s) => s.editingFieldId) === field.id;
  const setEditingField = useUIStore((s) => s.setEditingField);
  const selection = useUIStore((s) => (s.selection?.type === 'field' && s.selection.fieldId === field.id ? s.selection : null));
  const setSelection = useUIStore((s) => s.setSelection);
  const nameRef = useRef<HTMLInputElement>(null);
  const [localName, setLocalName] = useState(field.name);
  const [localType, setLocalType] = useState(field.type);
  const typeOptions = FIELD_TYPES_BY_DIALECT[dialect as Dialect] ?? [];

  const startEdit = useCallback(() => {
    if (readOnly) return;
    setLocalName(field.name);
    setLocalType(field.type);
    setEditingField(field.id);
    setSelection({ type: 'field', tableId, fieldId: field.id });
    setTimeout(() => nameRef.current?.focus(), 0);
  }, [field.name, field.type, field.id, tableId, setEditingField, setSelection, readOnly]);

  const commitEdit = useCallback(() => {
    if (localName.trim()) {
      updateField(tableId, field.id, { name: localName.trim(), type: localType });
    }
    setEditingField(null);
  }, [localName, localType, tableId, field.id, updateField, setEditingField]);

  const cancelEdit = useCallback(() => {
    setLocalName(field.name);
    setLocalType(field.type);
    setEditingField(null);
  }, [field.name, field.type, setEditingField]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
    if (e.key === 'Tab') { e.preventDefault(); commitEdit(); }
  };

  const isSelected = selection?.type === 'field' &&
    selection.tableId === tableId && selection.fieldId === field.id;

  return (
    <div
      className={[
        'field-row',
        isEditing ? 'field-row--editing' : '',
        isSelected && !isEditing ? 'field-row--selected' : '',
        isDragging ? 'field-row--dragging' : '',
        isDropTarget ? 'field-row--drop-target' : '',
      ].filter(Boolean).join(' ')}
      onDoubleClick={startEdit}
      onClick={() => { if (!readOnly && !isEditing) setSelection({ type: 'field', tableId, fieldId: field.id }); }}
      onDragOver={(e) => { e.preventDefault(); if (!readOnly) onDragOver(index); }}
      onDrop={readOnly ? () => {} : onDrop}
    >
      {/* React Flow field-level handles — one per side, connectionMode='loose' handles type matching */}
      <Handle
        type="target"
        position={Position.Left}
        id={`${tableId}__${field.id}__left`}
        className="field-handle field-handle--left"
        style={{ top: '50%', left: 'calc(var(--accent-bar-width, 4px) * -1)', transform: 'translate(-50%, -50%)' }}
        isConnectable={!readOnly && !isEditing}
      />
      <Handle
        type="source"
        position={Position.Right}
        id={`${tableId}__${field.id}__right`}
        className="field-handle field-handle--right"
        style={{ top: '50%', right: '-1px', transform: 'translate(50%, -50%)' }}
        isConnectable={!readOnly && !isEditing}
      />

      {/* Drag handle — only this element starts a field-reorder drag */}
      {!readOnly && !isEditing && (
        <span
          className="field-drag-handle"
          aria-hidden="true"
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            onDragStart(index);
          }}
        >⠿</span>
      )}

      {isEditing ? (
        <div className="field-row__edit-content">
          <input
            ref={nameRef}
            className="field-edit-name"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            placeholder="field_name"
            spellCheck={false}
          />
          <select
            className="field-edit-type mono"
            value={localType}
            onChange={(e) => setLocalType(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitEdit}
          >
            {typeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="field-row__view-content">
          <span className="field-name">{field.name || <em>unnamed</em>}</span>
          {!field.nullable && <span className="field-nullable-dot" title="NOT NULL">·</span>}
          <span className="field-type mono">{field.type}</span>
          <div className="field-badges">
            {field.isPK && <span className="badge badge--pk">PK</span>}
            {field.isFK && <span className="badge badge--fk">FK</span>}
          </div>
          {field.aiGenerated && (
            <span className="ai-mark" title="AI generated">✦</span>
          )}
        </div>
      )}
    </div>
  );
});

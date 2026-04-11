import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { FieldRow } from './FieldRow';
import { useSchemaStore } from '../../store/schema';
import { useUIStore } from '../../store/ui';
import { ACCENT_HEX, ACCENT_COLORS } from '../../utils/constants';
import type { Table, AccentColor } from '../../types/schema';
import './TableNode.css';

type TableNodeData = Table;

export const TableNode: React.FC<NodeProps> = ({ data, selected }) => {
  const table = data as unknown as TableNodeData;
  const { addField, reorderFields, updateTable, removeTable } = useSchemaStore();
  const { setSelection, density, selection, clearSelection, readOnly } = useUIStore();
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // ── Inline table rename ──────────────────────────
  const [renamingName, setRenamingName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [accentOpen, setAccentOpen] = useState(false);
  const accentPickerRef = useRef<HTMLDivElement>(null);

  // Fix: close the accent picker when the user clicks outside the table node
  useEffect(() => {
    if (!accentOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (accentPickerRef.current && !accentPickerRef.current.contains(e.target as Node)) {
        setAccentOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [accentOpen]);

  const accentHex = ACCENT_HEX[table.accentColor] ?? ACCENT_HEX.blue;
  const isSelected = selection?.type === 'table' && selection.tableId === table.id;

  const startRename = (e: React.MouseEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    setRenamingName(table.name);
    setIsRenaming(true);
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 0);
  };

  const commitRename = () => {
    const trimmed = renamingName.trim();
    if (trimmed && trimmed !== table.name) {
      updateTable(table.id, { name: trimmed });
    }
    setIsRenaming(false);
  };

  const handleRenameKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') { e.preventDefault(); setIsRenaming(false); }
  };

  // ── Field drag-reorder ───────────────────────────
  const handleDrop = useCallback(() => {
    if (dragFromIndex !== null && dragOverIndex !== null && dragFromIndex !== dragOverIndex) {
      reorderFields(table.id, dragFromIndex, dragOverIndex);
    }
    setDragFromIndex(null);
    setDragOverIndex(null);
  }, [dragFromIndex, dragOverIndex, table.id, reorderFields]);

  const handleAddField = (e: React.MouseEvent) => {
    e.stopPropagation();
    addField(table.id);
  };

  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelection({ type: 'table', tableId: table.id });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeTable(table.id);
    clearSelection();
  };

  const handleAccentPick = (e: React.MouseEvent, color: AccentColor) => {
    e.stopPropagation();
    updateTable(table.id, { accentColor: color });
    setAccentOpen(false);
  };

  return (
    <div
      className={[
        'table-node',
        selected ? 'table-node--selected' : '',
        `density-${density}`,
        isRenaming ? 'table-node--renaming' : '',
      ].filter(Boolean).join(' ')}
      role="group"
      aria-label={`Table: ${table.name}`}
      onClick={handleNodeClick}
    >
      {/* Left accent bar — click to pick color */}
      <div
        className="table-node__accent-bar"
        style={{ background: accentHex, cursor: readOnly ? 'default' : 'pointer' }}
        onClick={(e) => { 
          if (readOnly) return;
          e.stopPropagation(); 
          setAccentOpen((o) => !o); 
        }}
        title={readOnly ? undefined : "Change accent color"}
        role="button"
        tabIndex={0}
      />

      {/* Accent color picker */}
      {accentOpen && (
        <div
          ref={accentPickerRef}
          className="table-node__accent-picker"
          onClick={(e) => e.stopPropagation()}
        >
          {ACCENT_COLORS.map((color) => (
            <button
              key={color}
              className={`accent-swatch ${table.accentColor === color ? 'accent-swatch--active' : ''}`}
              style={{ background: ACCENT_HEX[color] }}
              onClick={(e) => handleAccentPick(e, color)}
              title={color}
              aria-label={`Set accent to ${color}`}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div
        className="table-node__header"
        onDoubleClick={startRename}
        title="Double-click to rename"
      >
        {isRenaming ? (
          <input
            ref={nameInputRef}
            className="table-node__name-input"
            value={renamingName}
            onChange={(e) => setRenamingName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleRenameKey}
            onClick={(e) => e.stopPropagation()}
            spellCheck={false}
          />
        ) : (
          <span className="table-node__name">{table.name}</span>
        )}
        <div className="table-node__header-actions">
          <span className="table-node__count">{table.fields.length}</span>
          {!readOnly && isSelected && (
            <button
              className="table-node__delete-btn"
              onClick={handleDelete}
              title="Delete table (Del)"
              aria-label="Delete table"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="table-node__fields">
        {table.fields.map((field, index) => (
          <FieldRow
            key={field.id}
            tableId={table.id}
            field={field}
            index={index}
            onDragStart={setDragFromIndex}
            onDragOver={setDragOverIndex}
            onDrop={readOnly ? () => {} : handleDrop}
            isDragging={dragFromIndex === index}
            isDropTarget={dragOverIndex === index && dragFromIndex !== index}
            readOnly={readOnly}
          />
        ))}
      </div>

      {/* Add field */}
      {!readOnly && (
      <button className="table-node__add-field" onClick={handleAddField}>
        + field
      </button>
      )}

    </div>
  );
};

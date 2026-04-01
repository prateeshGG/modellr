import React from 'react';
import { useSchemaStore } from '../../store/schema';
import { useUIStore } from '../../store/ui';
import { FIELD_TYPES_BY_DIALECT } from '../../utils/constants';
import type { Field, Dialect, Cardinality } from '../../types/schema';
import './RightPanel.css';

// Types that support length constraint
const LENGTH_TYPES = new Set(['varchar', 'char', 'character varying', 'nvarchar', 'nchar', 'binary', 'varbinary']);
// Types that support precision/scale
const PRECISION_TYPES = new Set(['numeric', 'decimal', 'float', 'real', 'money']);

const CARDINALITY_LABELS: Record<Cardinality, string> = {
  'one-to-one':  '1 : 1',
  'one-to-many': '1 : N',
  'many-to-many': 'N : M',
};

export const RightPanel: React.FC = () => {
  const { tables, relationships, updateField, updateTable, addField, removeField, removeRelationship, updateRelationship, removeTable, dialect } = useSchemaStore() as any;
  const { clearSelection, selection, rightPanelOpen, toggleRightPanel, readOnly } = useUIStore();

  if (!rightPanelOpen) return null;

  const selectedTable = selection?.type === 'table' || selection?.type === 'field'
    ? tables.find((t: any) => t.id === (selection as any).tableId)
    : null;

  const selectedField = selection?.type === 'field' && selectedTable
    ? selectedTable.fields.find((f: any) => f.id === (selection as any).fieldId)
    : null;

  const selectedRel = selection?.type === 'relationship'
    ? relationships?.find((r: any) => r.id === (selection as any).relationshipId)
    : null;

  const sourceTable = selectedRel ? tables.find((t: any) => t.id === selectedRel.sourceTableId) : null;
  const targetTable = selectedRel ? tables.find((t: any) => t.id === selectedRel.targetTableId) : null;

  const titleText = selectedField
    ? `${selectedTable?.name}.${selectedField.name}`
    : selectedTable
    ? selectedTable.name
    : selectedRel
    ? `${sourceTable?.name} → ${targetTable?.name}`
    : 'Properties';

  const subtitleText = selectedField ? 'field' : selectedTable ? 'table' : selectedRel ? 'relationship' : '';

  return (
    <aside className="right-panel" aria-label="Field editor panel">
      <div className="right-panel__header">
        <span className="right-panel__title">{titleText}</span>
        <span className="right-panel__subtitle">{subtitleText}</span>
        <button className="right-panel__close" onClick={toggleRightPanel} aria-label="Close panel">✕</button>
      </div>

      <div className="right-panel__body">
        {selectedField && selectedTable ? (
          <FieldEditor
            tableId={selectedTable.id}
            field={selectedField}
            dialect={dialect}
            onUpdate={(patch) => updateField(selectedTable.id, selectedField.id, patch)}
            onDelete={() => removeField(selectedTable.id, selectedField.id)}
            readOnly={readOnly}
          />
        ) : selectedTable ? (
          <TableEditor
            table={selectedTable}
            onUpdateTable={(patch: any) => updateTable(selectedTable.id, patch)}
            onAddField={() => addField(selectedTable.id)}
            onRemoveField={(fId: string) => removeField(selectedTable.id, fId)}
            onUpdateField={(fId: string, patch: any) => updateField(selectedTable.id, fId, patch)}
            onDeleteTable={() => { removeTable(selectedTable.id); clearSelection(); }}
            dialect={dialect}
            readOnly={readOnly}
          />
        ) : selectedRel ? (
          <RelationshipEditor
            relationship={selectedRel}
            sourceTable={sourceTable}
            targetTable={targetTable}
            onUpdate={(patch) => updateRelationship?.(selectedRel.id, patch)}
            onDelete={() => {
              removeRelationship?.(selectedRel.id);
              clearSelection();
            }}
            readOnly={readOnly}
          />
        ) : (
          <ProjectStats />
        )}
      </div>
    </aside>
  );
};

/* ── Relationship Editor ─────────────────────────── */
const RelationshipEditor: React.FC<{
  relationship: any;
  sourceTable: any;
  targetTable: any;
  onUpdate: (patch: any) => void;
  onDelete: () => void;
  readOnly?: boolean;
}> = ({ relationship, sourceTable, targetTable, onUpdate, onDelete, readOnly }) => {
  const sourceField = sourceTable?.fields?.find((f: any) => f.id === relationship.sourceFieldId);
  const targetField = targetTable?.fields?.find((f: any) => f.id === relationship.targetFieldId);

  return (
    <div className="rel-editor">
      <div className="panel-section">
        <div className="rel-editor__info">
          <div className="rel-editor__table">
            <span className="rel-editor__table-label">From</span>
            <span className="rel-editor__table-name">{sourceTable?.name}</span>
            <span className="rel-editor__field-name">.{sourceField?.name}</span>
          </div>
          <div className="rel-editor__arrow">→</div>
          <div className="rel-editor__table">
            <span className="rel-editor__table-label">To</span>
            <span className="rel-editor__table-name">{targetTable?.name}</span>
            <span className="rel-editor__field-name">.{targetField?.name}</span>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <label className="panel-label">Cardinality</label>
        <div className="cardinality-group">
          {(['one-to-one', 'one-to-many', 'many-to-many'] as Cardinality[]).map((c) => (
            <button
              key={c}
              className={`cardinality-btn ${relationship.cardinality === c ? 'cardinality-btn--active' : ''}`}
              onClick={() => onUpdate({ cardinality: c })}
              title={c}
              disabled={readOnly}
            >
              {CARDINALITY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {!readOnly && (
        <button className="panel-danger-btn" onClick={onDelete}>
          Delete relationship
        </button>
      )}
    </div>
  );
};

/* ── Field Editor ────────────────────────────────── */
interface FieldEditorProps {
  tableId: string;
  field: Field;
  dialect: any;
  onUpdate: (patch: Partial<Field>) => void;
  onDelete: () => void;
  readOnly?: boolean;
}

const FieldEditor: React.FC<FieldEditorProps> = ({ field, dialect, onUpdate, onDelete, readOnly }) => {
  const typeOptions: string[] = FIELD_TYPES_BY_DIALECT[dialect as Dialect] ?? FIELD_TYPES_BY_DIALECT.postgres;
  const showLength = LENGTH_TYPES.has(field.type.toLowerCase());
  const showPrecision = PRECISION_TYPES.has(field.type.toLowerCase());

  return (
    <div className="field-editor">
      <div className="panel-section">
        <label className="panel-label">Name</label>
        <input
          className="panel-input"
          value={field.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          spellCheck={false}
          disabled={readOnly}
        />
      </div>

      <div className="panel-section">
        <label className="panel-label">Type</label>
        <select className="panel-select" value={field.type} onChange={(e) => onUpdate({ type: e.target.value })} disabled={readOnly}>
          {typeOptions.map((t: string) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {showLength && (
        <div className="panel-section">
          <label className="panel-label">Length</label>
          <input
            className="panel-input"
            type="number"
            min={1}
            max={65535}
            value={field.length ?? ''}
            onChange={(e) => onUpdate({ length: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="e.g. 255"
            disabled={readOnly}
          />
        </div>
      )}

      {showPrecision && (
        <div className="panel-section panel-section--dual">
          <div>
            <label className="panel-label">Precision</label>
            <input
              className="panel-input"
              type="number"
              min={1}
              max={65}
              value={field.precision ?? ''}
              onChange={(e) => onUpdate({ precision: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="10"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="panel-label">Scale</label>
            <input
              className="panel-input"
              type="number"
              min={0}
              max={30}
              value={field.scale ?? ''}
              onChange={(e) => onUpdate({ scale: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="2"
              disabled={readOnly}
            />
          </div>
        </div>
      )}

      <div className="panel-section panel-section--row">
        <label className="panel-toggle-label">
          <input type="checkbox" checked={field.isPK} onChange={(e) => onUpdate({ isPK: e.target.checked })} disabled={readOnly} />
          Primary key
        </label>
        <label className="panel-toggle-label">
          <input type="checkbox" checked={!field.nullable} onChange={(e) => onUpdate({ nullable: !e.target.checked })} disabled={readOnly} />
          Not null
        </label>
        <label className="panel-toggle-label">
          <input type="checkbox" checked={field.unique} onChange={(e) => onUpdate({ unique: e.target.checked })} disabled={readOnly} />
          Unique
        </label>
      </div>

      <div className="panel-section">
        <label className="panel-label">Default</label>
        <input
          className="panel-input panel-input--mono"
          value={field.default ?? ''}
          onChange={(e) => onUpdate({ default: e.target.value || undefined })}
          placeholder="NULL"
          spellCheck={false}
          disabled={readOnly}
        />
      </div>

      <div className="panel-section">
        <label className="panel-label">Check constraint</label>
        <input
          className="panel-input panel-input--mono"
          value={field.check ?? ''}
          onChange={(e) => onUpdate({ check: e.target.value || undefined })}
          placeholder="e.g. value > 0"
          spellCheck={false}
          disabled={readOnly}
        />
      </div>

      <div className="panel-section">
        <label className="panel-label">Comment</label>
        <textarea
          className="panel-textarea"
          value={field.comment ?? ''}
          onChange={(e) => onUpdate({ comment: e.target.value || undefined })}
          rows={2}
          placeholder="Optional description"
          disabled={readOnly}
        />
      </div>

      {!readOnly && (
        <button className="panel-danger-btn" onClick={onDelete}>Delete field</button>
      )}
    </div>
  );
};

/* ── Table Editor ────────────────────────────────── */
const TableEditor: React.FC<{
  table: any;
  onUpdateTable: (p: any) => void;
  onAddField: () => void;
  onRemoveField: (id: string) => void;
  onUpdateField: (id: string, p: any) => void;
  onDeleteTable: () => void;
  dialect: any;
  readOnly?: boolean;
}> = ({ table, onUpdateTable, onAddField, onRemoveField, onUpdateField, onDeleteTable, dialect, readOnly }) => {
  const typeOptions: string[] = FIELD_TYPES_BY_DIALECT[dialect as Dialect] ?? FIELD_TYPES_BY_DIALECT.postgres;

  return (
    <div className="table-editor">
      <div className="panel-section">
        <label className="panel-label">Table name</label>
        <input
          className="panel-input"
          value={table.name}
          onChange={(e) => onUpdateTable({ name: e.target.value })}
          spellCheck={false}
          disabled={readOnly}
        />
      </div>

      <div className="panel-section">
        <label className="panel-label">Comment</label>
        <textarea
          className="panel-textarea"
          value={table.comment ?? ''}
          onChange={(e) => onUpdateTable({ comment: e.target.value || undefined })}
          rows={2}
          placeholder="Optional table description"
          disabled={readOnly}
        />
      </div>

      <div className="panel-section">
        <div className="panel-section-header">
          <label className="panel-label">FIELDS</label>
          {!readOnly && (
            <button className="panel-add-btn" onClick={onAddField}>+ Add field</button>
          )}
        </div>
        {table.fields.map((f: Field) => (
          <div key={f.id} className="panel-field-row">
            <input
              className="panel-mini-input"
              value={f.name}
              onChange={(e) => onUpdateField(f.id, { name: e.target.value })}
              spellCheck={false}
              placeholder="field_name"
              disabled={readOnly}
            />
            <select
              className="panel-mini-select"
              value={f.type}
              onChange={(e) => onUpdateField(f.id, { type: e.target.value })}
              disabled={readOnly}
            >
              {typeOptions.map((t: string) => <option key={t} value={t}>{t}</option>)}
            </select>
            {!readOnly && (
              <button className="panel-remove-btn" onClick={() => onRemoveField(f.id)} aria-label="Remove field">✕</button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <button className="panel-danger-btn" style={{ marginTop: 24 }} onClick={onDeleteTable}>
          Delete table
        </button>
      )}
    </div>
  );
};

/* ── Project Stats ───────────────────────────────── */
const ProjectStats: React.FC = () => {
  const { tables, relationships } = useSchemaStore();
  const totalFields = tables.reduce((a, t) => a + t.fields.length, 0);
  return (
    <div className="project-stats">
      <p className="stats-hint">Select a table or field to edit its properties.<br />Click a relationship edge to edit cardinality.</p>
      <div className="stats-grid">
        <div className="stat-card"><span className="stat-value">{tables.length}</span><span className="stat-label">Tables</span></div>
        <div className="stat-card"><span className="stat-value">{totalFields}</span><span className="stat-label">Fields</span></div>
        <div className="stat-card"><span className="stat-value">{relationships.length}</span><span className="stat-label">Relationships</span></div>
      </div>
    </div>
  );
};

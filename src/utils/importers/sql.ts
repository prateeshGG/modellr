import { Parser } from 'node-sql-parser';
import { nanoid } from '../../store/nanoid';
import type { Table, Field, Relationship, AccentColor } from '../../types/schema';
import { ACCENT_COLORS } from '../constants';

const parser = new Parser();

interface ImportResult {
  tables: Table[];
  relationships: Relationship[];
  errors: string[];
}

/**
 * Parse SQL DDL (CREATE TABLE statements) into SchemaForge tables and relationships.
 * Supports PostgreSQL, MySQL dialects.
 */
export function importSQL(sql: string): ImportResult {
  const errors: string[] = [];
  const tables: Table[] = [];
  const relationships: Relationship[] = [];

  // Strip comments and normalize
  const cleaned = sql
    .replace(/--[^\n]*/g, '')           // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')   // block comments
    .trim();

  if (!cleaned) {
    return { tables, relationships, errors: ['No SQL content found.'] };
  }

  let ast: any;
  try {
    ast = parser.astify(cleaned, { database: 'PostgreSQL' });
  } catch {
    try {
      ast = parser.astify(cleaned, { database: 'MySQL' });
    } catch (err2: any) {
      errors.push(`Parse error: ${err2?.message ?? 'unknown'}`);
      return { tables, relationships, errors };
    }
  }

  const stmts: any[] = Array.isArray(ast) ? ast : [ast];
  const tableNameToId = new Map<string, string>();

  // ── First pass: build tables ─────────────────────
  for (const stmt of stmts) {
    if (stmt?.type !== 'create' || stmt?.keyword !== 'table') continue;

    const rawName: string =
      stmt.table?.[0]?.table ?? stmt.table?.table ?? 'unnamed';
    const tableName = rawName.replace(/^"|"$/g, '').replace(/^`|`$/g, '');

    const tableId = nanoid();
    tableNameToId.set(tableName.toLowerCase(), tableId);

    const fields: Field[] = [];
    const colDefs: any[] = stmt.create_definitions ?? [];

    let fkConstraints: Array<{
      sourceFieldName: string;
      targetTableName: string;
    }> = [];

    for (const def of colDefs) {
      // Regular column
      if (def.resource === 'column') {
        // node-sql-parser shape: def.column = { type:'column_ref', column: { expr: { value: 'name' } } }
        const colNode = def.column;
        const fieldName = toStr(
          colNode?.column?.expr?.value ??  // standard PostgreSQL AST
          colNode?.column?.value ??         // alternate shape
          colNode?.column ??               // MySQL/simple shape
          colNode                           // fallback
        );

        const rawType = def.definition?.dataType ?? def.definition?.data_type ?? 'text';
        const fieldType = normalizeType(rawType);

        const constraints = def.definition?.constraint ?? def.definition?.constraints ?? [];
        const allConstraints = Array.isArray(constraints) ? constraints : [constraints];

        const isPK =
          allConstraints.some((c: any) => c?.type === 'primary key') ||
          def.primary_key === true ||
          typeof def.primary_key === 'string' ||  // "primary key" string in PostgreSQL AST
          def.definition?.primary_key === true;

        const isNotNull =
          allConstraints.some((c: any) => c?.type === 'not null') ||
          def.nullable?.type === 'not null' ||
          isPK;

        const isUnique =
          allConstraints.some((c: any) => c?.type === 'unique') ||
          def.unique === true ||
          def.definition?.unique === true;

        // Default value: scalar or expression
        const defaultRaw = def.default_val?.value;
        const defaultExpr =
          defaultRaw?.value ??           // string/number literal
          defaultRaw?.expr?.value ??     // expression like now()
          (typeof defaultRaw === 'string' ? defaultRaw : undefined);

        fields.push({
          id: nanoid(),
          name: fieldName,
          type: fieldType,
          nullable: !isNotNull,
          unique: isUnique,
          isPK,
          isFK: false,
          default: defaultExpr !== undefined ? String(defaultExpr) : undefined,
        });
      }

      // Table-level FK constraint
      if (def.resource === 'constraint' && def.constraint_type === 'foreign key') {
        const sourceCol = def.definition?.[0]?.column ?? def.definition?.[0];
        const targetTable = def.reference_definition?.table?.[0]?.table ?? '';
        if (sourceCol && targetTable) {
          fkConstraints.push({
            sourceFieldName: sourceCol.toString().replace(/^"|"$/g, ''),
            targetTableName: targetTable.replace(/^"|"$/g, ''),
          });
        }
      }
    }

    // Mark FK fields
    for (const fk of fkConstraints) {
      const field = fields.find(
        (f) => f.name.toLowerCase() === fk.sourceFieldName.toLowerCase()
      );
      if (field) field.isFK = true;
    }

    const accentColor: AccentColor = ACCENT_COLORS[tables.length % ACCENT_COLORS.length];

    tables.push({
      id: tableId,
      name: tableName,
      accentColor,
      position: {
        x: 80 + (tables.length % 4) * 280,
        y: 80 + Math.floor(tables.length / 4) * 180,
      },
      fields,
    });

    // Store FK constraints for second pass
    (tables[tables.length - 1] as any).__fkConstraints = fkConstraints;
  }

  // ── Second pass: build relationships ─────────────
  for (const table of tables) {
    const fkConstraints: Array<{ sourceFieldName: string; targetTableName: string }> =
      (table as any).__fkConstraints ?? [];

    for (const fk of fkConstraints) {
      const targetTableId = tableNameToId.get(fk.targetTableName.toLowerCase());
      if (!targetTableId) continue;

      const targetTable = tables.find((t) => t.id === targetTableId);
      if (!targetTable) continue;

      const sourceField = table.fields.find(
        (f) => f.name.toLowerCase() === fk.sourceFieldName.toLowerCase()
      );
      const targetPK = targetTable.fields.find((f) => f.isPK);

      if (sourceField && targetPK) {
        relationships.push({
          id: nanoid(),
          sourceTableId: table.id,
          sourceFieldId: sourceField.id,
          targetTableId,
          targetFieldId: targetPK.id,
          cardinality: 'one-to-many',
        });
      }
    }

    // Clean up temp property
    delete (table as any).__fkConstraints;
  }

  if (tables.length === 0) {
    errors.push('No CREATE TABLE statements found in the SQL.');
  }

  return { tables, relationships, errors };
}

/** Safely extract a string from any node-sql-parser AST value */
function toStr(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'string') return val.replace(/^["'`]|["'`]$/g, '');
  if (typeof val === 'object') {
    const o = val as Record<string, unknown>;
    const s = (o.value ?? o.name ?? o.column ?? '') as string;
    return String(s).replace(/^["'`]|["'`]$/g, '');
  }
  return String(val);
}

function normalizeType(raw: string): string {
  if (!raw) return 'text';
  const t = raw.toLowerCase().trim();

  // Strip size params: varchar(255) → varchar
  const base = t.replace(/\s*\(.*\)/, '').trim();

  const typeMap: Record<string, string> = {
    'int': 'integer', 'int4': 'integer', 'int2': 'smallint',
    'int8': 'bigint', 'serial4': 'serial', 'serial8': 'bigserial',
    'float4': 'real', 'float8': 'double precision',
    'bool': 'boolean', 'character varying': 'varchar',
    'character': 'char', 'nvarchar': 'varchar', 'nchar': 'char',
    'datetime': 'timestamp', 'datetime2': 'timestamp',
    'uniqueidentifier': 'uuid',
  };

  return typeMap[base] ?? base;
}

import { nanoid } from '../../store/nanoid';
import type { Table, Field, Relationship, AccentColor } from '../../types/schema';
import { ACCENT_COLORS } from '../constants';

interface PrismaImportResult {
  tables: Table[];
  relationships: Relationship[];
  errors: string[];
}

/**
 * Parse a Prisma schema string (schema.prisma) into Modellr tables + relationships.
 *
 * Handles:
 * - model blocks with fields, @id, @unique, @default, @relation
 * - datasource db { provider = "..." }
 * - Prisma scalar types → SQL types
 */
export function importPrisma(prismaText: string): PrismaImportResult {
  const errors: string[] = [];
  const tables: Table[] = [];
  const relationships: Relationship[] = [];

  // Strip comments
  const cleaned = prismaText
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // ── Extract model blocks ─────────────────────────
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let modelMatch: RegExpExecArray | null;
  const tableNameToId = new Map<string, string>();

  // Pass 1: create tables
  while ((modelMatch = modelRegex.exec(cleaned)) !== null) {
    const modelName = modelMatch[1];
    const modelBody = modelMatch[2];

    const tableId = nanoid();
    tableNameToId.set(modelName, tableId);

    const fields: Field[] = [];
    const pendingRelations: Array<{
      fieldId: string;
      targetModelName: string;
      foreignFieldName?: string;
    }> = [];

    const lines = modelBody.split('\n').map((l) => l.trim()).filter(Boolean);

    for (const line of lines) {
      // Skip block-level attributes (@@index, @@unique, @@map, etc.)
      if (line.startsWith('@@')) continue;

      // Parse field: fieldName  Type  attributes...
      const fieldMatch = line.match(/^(\w+)\s+(\w+)(\??)\s*(.*)?$/);
      if (!fieldMatch) continue;

      const [, fieldName, prismaType, optMark, attrStr = ''] = fieldMatch;
      const isOptional = optMark === '?';
      const isList = prismaType.endsWith('[]') || attrStr.includes('[]');

      // Skip relation scalar fields that will be auto-detected via @relation
      // But keep them if they look like real fields
      const sqlType = prismaTypeToSQL(prismaType.replace('[]', ''));

      const isPK = attrStr.includes('@id');
      const isUnique = attrStr.includes('@unique');

      // @default(...)
      let defaultVal: string | undefined;
      const defaultMatch = attrStr.match(/@default\(([^)]+)\)/);
      if (defaultMatch) {
        const d = defaultMatch[1];
        defaultVal = d === 'now()' ? 'now()' :
          d === 'autoincrement()' ? undefined :
            d === 'uuid()' ? 'gen_random_uuid()' :
              d === 'cuid()' ? undefined :
                d === 'true' ? 'TRUE' :
                  d === 'false' ? 'FALSE' :
                    d.startsWith('"') ? d.slice(1, -1) :
                      d;
      }

      // @relation — this is a virtual relation field, not a real column
      const relationMatch = attrStr.match(/@relation\(([^)]+)\)/);
      if (relationMatch && !attrStr.includes('@id')) {
        // This is a relational object field (not the FK scalar).
        // If it has fields: [...] references: [...] it IS the FK side.
        const relArgs = relationMatch[1];
        const fieldsMatch = relArgs.match(/fields:\s*\[([^\]]+)\]/);
        if (fieldsMatch) {
          // This is the FK owner — record the target for later
          pendingRelations.push({
            fieldId: '',  // will be resolved later by field name
            targetModelName: prismaType,
            foreignFieldName: fieldsMatch ? fieldsMatch[1].trim() : undefined,
          });
        }
        // Don't push this as a real column
        continue;
      }

      // Skip list fields (back-relations)
      if (isList) continue;

      // If it's an uppercase type that's a model name, skip (back-relation without @relation attr)
      if (prismaType[0] === prismaType[0].toUpperCase() && !isPrismaScalar(prismaType)) continue;

      const field: Field = {
        id: nanoid(),
        name: fieldName,
        type: sqlType,
        nullable: isOptional,
        unique: isUnique,
        isPK,
        isFK: false,
        default: isPK && autoIncrementType(prismaType) ? undefined : defaultVal,
      };

      fields.push(field);

      // If autoincrement PK, use serial/bigserial
      if (isPK && autoIncrementType(prismaType) && attrStr.includes('autoincrement()')) {
        field.type = prismaType.toLowerCase() === 'int' ? 'serial' : 'bigserial';
      }
    }

    // Resolve pending relation FK fields into field markers
    for (const rel of pendingRelations) {
      if (rel.foreignFieldName) {
        const fkField = fields.find((f) => f.name === rel.foreignFieldName);
        if (fkField) {
          fkField.isFK = true;
          (fkField as any).__relTarget = rel.targetModelName;
        }
      }
    }

    const accentColor: AccentColor = ACCENT_COLORS[tables.length % ACCENT_COLORS.length];

    tables.push({
      id: tableId,
      name: modelNameToTableName(modelName),
      accentColor,
      position: {
        x: 80 + (tables.length % 4) * 300,
        y: 80 + Math.floor(tables.length / 4) * 200,
      },
      fields,
    });
  }

  if (tables.length === 0) {
    errors.push('No model blocks found in the Prisma schema.');
    return { tables, relationships, errors };
  }

  // ── Pass 2: build relationships from FK markers ──
  for (const table of tables) {
    for (const field of table.fields) {
      const targetModelName = (field as any).__relTarget;
      if (!targetModelName) continue;
      delete (field as any).__relTarget;

      const targetTableId = tableNameToId.get(targetModelName);
      if (!targetTableId) continue;

      const targetTable = tables.find((t) => t.id === targetTableId);
      const targetPK = targetTable?.fields.find((f) => f.isPK);
      if (!targetPK) continue;

      relationships.push({
        id: nanoid(),
        sourceTableId: table.id,
        sourceFieldId: field.id,
        targetTableId,
        targetFieldId: targetPK.id,
        cardinality: 'one-to-many',
      });
    }
  }

  return { tables, relationships, errors };
}

// ── Helpers ────────────────────────────────────────

const PRISMA_SCALARS = new Set([
  'String', 'Boolean', 'Int', 'BigInt', 'Float', 'Decimal',
  'DateTime', 'Json', 'Bytes', 'Unsupported',
]);

function isPrismaScalar(type: string): boolean {
  return PRISMA_SCALARS.has(type);
}

function autoIncrementType(type: string): boolean {
  return type === 'Int' || type === 'BigInt';
}

function prismaTypeToSQL(type: string): string {
  const map: Record<string, string> = {
    String: 'text',
    Boolean: 'boolean',
    Int: 'integer',
    BigInt: 'bigint',
    Float: 'double precision',
    Decimal: 'numeric',
    DateTime: 'timestamptz',
    Json: 'jsonb',
    Bytes: 'bytea',
  };
  return map[type] ?? 'text';
}

/** PascalCase model → snake_case table name */
function modelNameToTableName(name: string): string {
  return name
    .replace(/([A-Z])/g, (_, l, i) => (i === 0 ? l : '_' + l))
    .toLowerCase();
}

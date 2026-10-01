/**
 * System prompts + tolerant response parsing for the AI features.
 * (Previously these lived in server/routes/openai.js.)
 *
 * Everything here is pure: nothing mutates its inputs.
 */
import type { Table, Relationship, Cardinality } from '../types/schema';
import type { ChatMessage } from './aiClient';

// ── Prompts ─────────────────────────────────────────────────────────────────

export const SUGGEST_SYSTEM_PROMPT = `You are a senior database architect. Analyze a database table and provide concise, actionable suggestions.
Format your response with these sections (use the exact emoji headers):
📋 Missing Fields — list specific columns this table likely needs, with types
🔑 Indexes — which columns should be indexed and why
⚡ Normalization — structural improvements if any
💡 Best Practices — data integrity, naming, or constraint tips
Keep each point to 1-2 sentences. Be direct and practical.`;

export const DESCRIBE_SYSTEM_PROMPT =
  'You are a helpful database documentation assistant. Write one concise sentence (max 20 words) describing what a database column is used for.';

export const GENERATE_SYSTEM_PROMPT = `You are a database schema designer. Given a description, output a JSON schema object.

Rules:
- Output ONLY valid JSON, no markdown, no explanation
- Use snake_case for all table and field names
- Include appropriate id field (bigserial PK) for each table
- Include created_at (timestamptz) for important tables
- Use realistic PostgreSQL types: text, varchar, integer, bigint, bigserial, boolean, timestamptz, numeric, jsonb, uuid
- Infer foreign key relationships from context

Output format:
{
  "tables": [
    {
      "name": "table_name",
      "fields": [
        { "name": "id", "type": "bigserial", "isPK": true, "nullable": false },
        { "name": "field_name", "type": "text", "nullable": false }
      ]
    }
  ],
  "relationships": [
    { "from": "orders", "fromField": "customer_id", "to": "customers", "toField": "id", "cardinality": "one-to-many" }
  ]
}`;

export const MODIFY_SYSTEM_PROMPT = `You are Modellr AI, an expert Database Architect acting directly on a visual schema canvas. Given the current JSON context of the user's schema and their request, output the exact sequence of structural operations needed to modify their schema to fulfill the request.

Reply with ONLY one JSON object (no markdown fences, no text outside the JSON) in this exact shape:
{
  "analysis": "Extremely brief reasoning for these exact changes (1-2 sentences).",
  "operations": [ <operation>, ... ]
}

Operations (use ONLY these actions, in the order they must be applied):
- {"action":"add_table","tableName":"orders","newFields":[{"name":"id","type":"bigserial","isPK":true,"unique":true,"nullable":false,"isFK":false}, ...]}
- {"action":"remove_table","tableName":"orders"}
- {"action":"add_field","tableName":"orders","fieldName":"total","newFields":[{"name":"total","type":"numeric(10,2)","nullable":false}]}  (newFields has exactly 1 item)
- {"action":"modify_field","tableName":"orders","fieldName":"total","fieldUpdates":{"type":"numeric(12,2)","nullable":true}}  (allowed keys: name, type, isPK, unique, nullable, isFK, default)
- {"action":"remove_field","tableName":"orders","fieldName":"total"}
- {"action":"add_relationship","tableName":"orders","fieldName":"customer_id","relationTargetTable":"customers","relationTargetField":"id","relationCardinality":"one-to-many"}  (tableName.fieldName is the foreign-key column and must already exist, e.g. created by an earlier add_table/add_field; cardinality is one-to-many, one-to-one or many-to-many)

Rules:
- Refer to existing tables and fields by their exact current names.
- Use snake_case names and PostgreSQL types (text, varchar(255), integer, bigint, bigserial, boolean, timestamptz, numeric, jsonb, uuid).
- Every new table needs an id primary key unless the user says otherwise. Mark foreign key columns with "isFK": true.
- Do not repeat things that already exist in the schema.
- If the user only asks a question or no change is needed, return an empty "operations" array and answer in "analysis".`;

function fieldToText(f: Table['fields'][number]): string {
  return `${f.name} ${f.type}${f.isPK ? ' PK' : ''}${f.isFK ? ' FK' : ''}${!f.nullable ? ' NOT NULL' : ''}${f.unique ? ' UNIQUE' : ''}`;
}

export function tableToText(table: Table): string {
  return `Table "${table.name}" (${table.fields.map(fieldToText).join(', ')})`;
}

export function relationshipsToText(tables: Table[], relationships: Relationship[]): string {
  if (!relationships.length) return '';
  const lines = relationships.map((r) => {
    const src = tables.find((t) => t.id === r.sourceTableId);
    const tgt = tables.find((t) => t.id === r.targetTableId);
    return `${src?.name ?? r.sourceTableId} → ${tgt?.name ?? r.targetTableId} (${r.cardinality})`;
  });
  return `\nRelationships:\n${lines.join('\n')}`;
}

export function buildSuggestMessages(table: Table, tables: Table[], relationships: Relationship[]): ChatMessage[] {
  return [
    { role: 'system', content: SUGGEST_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Full schema:\n${tables.map(tableToText).join('\n')}${relationshipsToText(tables, relationships)}\n\nAnalyze this table:\n${tableToText(table)}`,
    },
  ];
}

export function buildDescribeMessages(tableName: string, fieldName: string, fieldType: string): ChatMessage[] {
  return [
    { role: 'system', content: DESCRIBE_SYSTEM_PROMPT },
    { role: 'user', content: `Table: ${tableName}\nField: ${fieldName} (${fieldType})\nWrite a one-sentence description.` },
  ];
}

export function buildGenerateMessages(prompt: string): ChatMessage[] {
  return [
    { role: 'system', content: GENERATE_SYSTEM_PROMPT },
    { role: 'user', content: `Design a database schema for: ${prompt}` },
  ];
}

/** Compact, id-free view of the schema (saves tokens and keeps the model on names). */
export function compactSchema(tables: Table[], relationships: Relationship[]) {
  const nameOf = (id: string) => tables.find((t) => t.id === id);
  return {
    tables: tables.map((t) => ({
      name: t.name,
      fields: t.fields.map((f) => ({
        name: f.name,
        type: f.type,
        ...(f.isPK ? { isPK: true } : {}),
        ...(f.isFK ? { isFK: true } : {}),
        nullable: f.nullable,
        ...(f.unique ? { unique: true } : {}),
        ...(f.default ? { default: f.default } : {}),
      })),
    })),
    relationships: relationships.flatMap((r) => {
      const s = nameOf(r.sourceTableId);
      const t = nameOf(r.targetTableId);
      if (!s || !t) return [];
      return [{
        from: s.name,
        fromField: s.fields.find((f) => f.id === r.sourceFieldId)?.name,
        to: t.name,
        toField: t.fields.find((f) => f.id === r.targetFieldId)?.name,
        cardinality: r.cardinality,
      }];
    }),
  };
}

export function buildModifyMessages(
  prompt: string,
  tables: Table[],
  relationships: Relationship[],
  history: ChatMessage[] = [],
): ChatMessage[] {
  return [
    { role: 'system', content: MODIFY_SYSTEM_PROMPT },
    ...history.slice(-6),
    {
      role: 'user',
      content: `CURRENT SCHEMA CONTEXT:\n${JSON.stringify(compactSchema(tables, relationships))}\n\nUSER REQUEST: ${prompt}`,
    },
  ];
}

// ── Tolerant JSON extraction ───────────────────────────────────────────────

export class AIParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIParseError';
  }
}

/** Scan from `start` to the matching close bracket, respecting strings. Returns end index (inclusive) or -1. */
function matchBracket(text: string, start: number): number {
  const open = text[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) return i;
  }
  return -1;
}

function tryParse(s: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(s) };
  } catch {
    return { ok: false };
  }
}

/**
 * Extract the first JSON object/array from LLM output. Handles ```json fences,
 * leading/trailing prose and unterminated fences. Throws AIParseError otherwise.
 */
export function extractJSON(text: string): unknown {
  // Strip a leading byte-order mark (U+FEFF), written as an escape so it is visible in source.
  const src = (text ?? '').replace(/^\uFEFF/, '').trim();
  if (!src) throw new AIParseError('The model returned an empty response.');

  const direct = tryParse(src);
  if (direct.ok && typeof direct.value === 'object' && direct.value !== null) return direct.value;

  const candidates: string[] = [];
  const fenceRe = /```[a-zA-Z0-9_-]*\s*\n?([\s\S]*?)(?:```|$)/g;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(src))) {
    if (m[1].trim()) candidates.push(m[1].trim());
    if (m[0].length === 0) fenceRe.lastIndex++;
  }
  candidates.push(src);

  let sawOpen = false;
  for (const cand of candidates) {
    const whole = tryParse(cand);
    if (whole.ok && typeof whole.value === 'object' && whole.value !== null) return whole.value;
    for (let i = 0; i < cand.length; i++) {
      const c = cand[i];
      if (c !== '{' && c !== '[') continue;
      sawOpen = true;
      const end = matchBracket(cand, i);
      if (end === -1) continue;
      const r = tryParse(cand.slice(i, end + 1));
      if (r.ok && typeof r.value === 'object' && r.value !== null) return r.value;
    }
  }
  throw new AIParseError(
    sawOpen
      ? 'The model returned incomplete or invalid JSON (the answer may have been cut off). Try again or use a more capable model.'
      : 'The model did not return JSON. Try again or use a more capable model.',
  );
}

// ── Validation / normalisation ─────────────────────────────────────────────

export type AIAction = 'add_table' | 'remove_table' | 'add_field' | 'modify_field' | 'remove_field' | 'add_relationship';

export interface AIFieldSpec {
  name: string;
  type: string;
  isPK: boolean;
  unique: boolean;
  nullable: boolean;
  isFK: boolean;
  default?: string;
}

export interface AIOperation {
  action: AIAction;
  tableName: string;
  fieldName?: string;
  newFields?: AIFieldSpec[];
  fieldUpdates?: Partial<AIFieldSpec>;
  relationTargetTable?: string;
  relationTargetField?: string;
  relationCardinality?: Cardinality;
}

const ACTIONS: ReadonlySet<string> = new Set(['add_table', 'remove_table', 'add_field', 'modify_field', 'remove_field', 'add_relationship']);
const CARDINALITIES: ReadonlySet<string> = new Set(['one-to-many', 'one-to-one', 'many-to-many']);

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const bool = (v: unknown): boolean | undefined => {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
};
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function defaultValue(v: unknown): string | undefined {
  if (typeof v === 'string') return v.trim() ? v : undefined;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return undefined;
}

/** Whitelist-copy a field spec. Never carries `id` or unknown keys. */
export function normalizeField(raw: unknown): AIFieldSpec | null {
  if (!isObj(raw)) return null;
  const name = str(raw.name);
  if (!name) return null;
  const isPK = bool(raw.isPK) ?? false;
  const explicitNullable = bool(raw.nullable);
  const field: AIFieldSpec = {
    name,
    type: str(raw.type) ?? 'text',
    isPK,
    unique: bool(raw.unique) ?? false,
    // A PK can never be nullable; otherwise default to nullable (SQL default) unless told otherwise.
    nullable: isPK ? false : (explicitNullable ?? true),
    isFK: bool(raw.isFK) ?? false,
  };
  const def = defaultValue(raw.default);
  if (def !== undefined) field.default = def;
  return field;
}

function normalizeFieldList(raw: unknown): AIFieldSpec[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: AIFieldSpec[] = [];
  for (const r of raw) {
    const f = normalizeField(r);
    if (!f || seen.has(f.name)) continue;
    seen.add(f.name);
    out.push(f);
  }
  return out;
}

function normalizeUpdates(raw: unknown): AIOperation['fieldUpdates'] | null {
  if (!isObj(raw)) return null;
  const u: NonNullable<AIOperation['fieldUpdates']> = {};
  const name = str(raw.name);
  if (name) u.name = name;
  const type = str(raw.type);
  if (type) u.type = type;
  for (const k of ['isPK', 'unique', 'nullable', 'isFK'] as const) {
    const b = bool(raw[k]);
    if (b !== undefined) u[k] = b;
  }
  const def = defaultValue(raw.default);
  if (def !== undefined) u.default = def;
  if (u.isPK === true && u.nullable === undefined) u.nullable = false;
  return Object.keys(u).length ? u : null; // `id` and anything else is dropped on purpose
}

export function normalizeOperation(raw: unknown): AIOperation | null {
  if (!isObj(raw)) return null;
  const action = typeof raw.action === 'string' ? raw.action.trim().toLowerCase() : '';
  if (!ACTIONS.has(action)) return null;
  const tableName = str(raw.tableName);
  if (!tableName) return null;

  switch (action as AIAction) {
    case 'add_table': {
      let newFields = normalizeFieldList(raw.newFields);
      if (!newFields.length) {
        newFields = [{ name: 'id', type: 'bigserial', isPK: true, unique: true, nullable: false, isFK: false }];
      }
      return { action: 'add_table', tableName, newFields };
    }
    case 'remove_table':
      return { action: 'remove_table', tableName };
    case 'add_field': {
      const [field] = normalizeFieldList(raw.newFields);
      if (!field) return null;
      return { action: 'add_field', tableName, fieldName: field.name, newFields: [field] };
    }
    case 'remove_field': {
      const fieldName = str(raw.fieldName);
      return fieldName ? { action: 'remove_field', tableName, fieldName } : null;
    }
    case 'modify_field': {
      const fieldName = str(raw.fieldName);
      const fieldUpdates = normalizeUpdates(raw.fieldUpdates);
      return fieldName && fieldUpdates ? { action: 'modify_field', tableName, fieldName, fieldUpdates } : null;
    }
    case 'add_relationship': {
      const fieldName = str(raw.fieldName);
      const relationTargetTable = str(raw.relationTargetTable);
      if (!fieldName || !relationTargetTable) return null;
      const card = typeof raw.relationCardinality === 'string' ? raw.relationCardinality.trim().toLowerCase() : '';
      return {
        action: 'add_relationship',
        tableName,
        fieldName,
        relationTargetTable,
        relationTargetField: str(raw.relationTargetField) ?? 'id',
        relationCardinality: (CARDINALITIES.has(card) ? card : 'one-to-many') as Cardinality,
      };
    }
  }
  return null;
}

/** Validate a list of raw operations: unknown/malformed ones are dropped (and counted). */
export function validateOperations(raw: unknown): { operations: AIOperation[]; dropped: number } {
  if (!Array.isArray(raw)) return { operations: [], dropped: 0 };
  const operations: AIOperation[] = [];
  let dropped = 0;
  for (const r of raw) {
    const op = normalizeOperation(r);
    if (op) operations.push(op);
    else dropped++;
  }
  return { operations, dropped };
}

export interface ParsedModification {
  analysis: string;
  operations: AIOperation[];
  dropped: number;
  /** false when the model answered in plain prose (shown as the analysis, no operations). */
  parsed: boolean;
}

/** Parse the reply of the "modify schema" prompt. Never throws: prose becomes `analysis`. */
export function parseOperationsResponse(text: string): ParsedModification {
  let obj: unknown;
  try {
    obj = extractJSON(text);
  } catch {
    return { analysis: (text ?? '').trim(), operations: [], dropped: 0, parsed: false };
  }
  let rawOps: unknown;
  let analysis = '';
  if (Array.isArray(obj)) {
    rawOps = obj;
  } else if (isObj(obj)) {
    rawOps = obj.operations ?? obj.ops ?? obj.changes;
    analysis = str(obj.analysis) ?? str(obj.explanation) ?? str(obj.summary) ?? '';
  }
  const { operations, dropped } = validateOperations(rawOps);
  return { analysis, operations, dropped, parsed: true };
}

// ── Generated schema ───────────────────────────────────────────────────────

export interface GeneratedSchema {
  tables: { name: string; fields: AIFieldSpec[] }[];
  relationships: { from: string; fromField: string; to: string; toField: string; cardinality: Cardinality }[];
}

/** Parse + validate the reply of the "generate schema" prompt. Throws AIParseError if unusable. */
export function parseGeneratedSchema(text: string): GeneratedSchema {
  const obj = extractJSON(text);
  const root = isObj(obj) ? obj : { tables: obj };
  const rawTables = Array.isArray(root.tables) ? root.tables : [];

  const tables: GeneratedSchema['tables'] = [];
  const seen = new Set<string>();
  for (const t of rawTables) {
    if (!isObj(t)) continue;
    const name = str(t.name);
    if (!name || seen.has(name)) continue;
    const fields = normalizeFieldList(t.fields);
    if (!fields.length) continue;
    seen.add(name);
    tables.push({ name, fields });
  }
  if (!tables.length) throw new AIParseError('The model did not return any tables. Try rephrasing your description.');

  const relationships: GeneratedSchema['relationships'] = [];
  const rawRels = Array.isArray(root.relationships) ? root.relationships : [];
  for (const r of rawRels) {
    if (!isObj(r)) continue;
    const from = str(r.from);
    const fromField = str(r.fromField);
    const to = str(r.to);
    const toField = str(r.toField) ?? 'id';
    if (!from || !fromField || !to) continue;
    const src = tables.find((t) => t.name === from);
    const tgt = tables.find((t) => t.name === to);
    if (!src?.fields.some((f) => f.name === fromField) || !tgt?.fields.some((f) => f.name === toField)) continue;
    const card = typeof r.cardinality === 'string' ? r.cardinality.trim().toLowerCase() : '';
    relationships.push({ from, fromField, to, toField, cardinality: (CARDINALITIES.has(card) ? card : 'one-to-many') as Cardinality });
  }
  return { tables, relationships };
}

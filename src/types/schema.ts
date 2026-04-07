export type Dialect = 'postgres' | 'mysql' | 'sqlite' | 'mssql';
export type Cardinality = 'one-to-one' | 'one-to-many' | 'many-to-many';
export type AccentColor =
  | 'blue' | 'teal' | 'coral' | 'purple'
  | 'amber' | 'green' | 'pink' | 'gray';
export type Density = 'comfortable' | 'compact';
export type AppMode = 'canvas' | 'split' | 'code';
export type Theme = 'light' | 'dark';

export interface Field {
  id: string;
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  unique: boolean;
  isPK: boolean;
  isFK: boolean;
  check?: string;
  comment?: string;
  aiGenerated?: boolean;
  // Type constraints
  length?: number;       // varchar(255), char(10)
  precision?: number;    // numeric(10, 2)
  scale?: number;        // numeric(10, 2) → 2
}

export interface Table {
  id: string;
  name: string;
  fields: Field[];
  position: { x: number; y: number };
  accentColor: AccentColor;
  comment?: string;
  groupId?: string;
}

export interface Note {
  id: string;
  content: string;
  position: { x: number; y: number };
  color: AccentColor;
  width: number;
  height: number;
}

export interface Group {
  id: string;
  name: string;
  color: AccentColor;
  position: { x: number; y: number };
  width: number;
  height: number;
}

export interface Relationship {
  id: string;
  sourceTableId: string;
  sourceFieldId: string;
  targetTableId: string;
  targetFieldId: string;
  cardinality: Cardinality;
}

export interface Snapshot {
  id: string;
  label: string;
  timestamp: number;
  tables: Table[];
  relationships: Relationship[];
  notes?: Note[];
  groups?: Group[];
}

export type SelectionTarget =
  | { type: 'table'; tableId: string }
  | { type: 'field'; tableId: string; fieldId: string }
  | { type: 'relationship'; relationshipId: string }
  | { type: 'note'; noteId: string }
  | { type: 'group'; groupId: string }
  | null;

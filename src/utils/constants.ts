import type { AccentColor, Dialect } from '../types/schema';

export const ACCENT_COLORS: AccentColor[] = [
  'blue', 'teal', 'coral', 'purple',
  'amber', 'green', 'pink', 'gray',
];

export const ACCENT_HEX: Record<AccentColor, string> = {
  blue:   '#378ADD',
  teal:   '#1D9E75',
  coral:  '#D85A38',
  purple: '#7F77DD',
  amber:  '#B9A717',
  green:  '#639922',
  pink:   '#D4537E',
  gray:   '#888780',
};

export const DIALECTS: Dialect[] = ['postgres', 'mysql', 'sqlite', 'mssql'];

export const DIALECT_LABELS: Record<Dialect, string> = {
  postgres: 'PostgreSQL',
  mysql:    'MySQL',
  sqlite:   'SQLite',
  mssql:    'SQL Server',
};

export const FIELD_TYPES_BY_DIALECT: Record<Dialect, string[]> = {
  postgres: [
    'bigint', 'bigserial', 'boolean', 'bytea', 'char', 'date',
    'decimal', 'double precision', 'float', 'inet', 'integer',
    'interval', 'json', 'jsonb', 'numeric', 'real', 'serial',
    'smallint', 'text', 'time', 'timestamp', 'timestamptz',
    'uuid', 'varchar',
  ],
  mysql: [
    'bigint', 'binary', 'bit', 'blob', 'boolean', 'char', 'date',
    'datetime', 'decimal', 'double', 'enum', 'float', 'int',
    'json', 'longblob', 'longtext', 'mediumblob', 'mediumint',
    'mediumtext', 'smallint', 'text', 'time', 'timestamp',
    'tinyblob', 'tinyint', 'tinytext', 'varbinary', 'varchar', 'year',
  ],
  sqlite: [
    'blob', 'integer', 'numeric', 'real', 'text',
  ],
  mssql: [
    'bigint', 'binary', 'bit', 'char', 'date', 'datetime',
    'datetime2', 'datetimeoffset', 'decimal', 'float', 'image',
    'int', 'money', 'nchar', 'ntext', 'numeric', 'nvarchar',
    'real', 'smalldatetime', 'smallint', 'smallmoney', 'text',
    'time', 'tinyint', 'uniqueidentifier', 'varbinary', 'varchar',
    'xml',
  ],
};

export const CANVAS_SNAP_GRID: [number, number] = [8, 8];
export const PILL_NODE_ZOOM_THRESHOLD = 0.0; // disabled per user feedback: tables remain fully expanded at all zooms
export const MAX_UNDO_STEPS = 50;
export const MAX_SNAPSHOTS = 50;

// Fix #75/#76: shared TEMPLATE_CATEGORIES used by TemplatesPage and PublicTemplates
// Previously each file defined its own inline copy; this is the single source of truth.
export const TEMPLATE_CATEGORIES = [
  { id: 'all',       label: 'All Templates' },
  { id: 'saas',      label: 'SaaS & Metrics' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'cms',       label: 'CMS & Blogs' },
  { id: 'auth',      label: 'Auth & Social' },
] as const;

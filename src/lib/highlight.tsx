import { Fragment, type ReactNode } from 'react';

export type CodeLang = 'sql' | 'prisma' | 'ts' | 'dbml';

const KEYWORDS: Record<CodeLang, string[]> = {
  sql: ['CREATE', 'TABLE', 'PRIMARY', 'KEY', 'NOT', 'NULL', 'UNIQUE', 'DEFAULT', 'REFERENCES', 'FOREIGN', 'ALTER', 'ADD', 'DROP', 'COLUMN', 'INDEX', 'ON', 'CONSTRAINT', 'CHECK', 'IF', 'EXISTS'],
  prisma: ['model', 'generator', 'datasource', 'enum', 'provider', 'url'],
  ts: ['import', 'from', 'export', 'const', 'type'],
  dbml: ['Table', 'Ref', 'Enum', 'Indexes', 'Note'],
};
const TYPES: Record<CodeLang, string[]> = {
  sql: ['uuid', 'text', 'serial', 'bigserial', 'integer', 'int', 'bigint', 'boolean', 'timestamptz', 'timestamp', 'varchar', 'numeric', 'jsonb', 'date'],
  prisma: ['String', 'Int', 'BigInt', 'Boolean', 'DateTime', 'Json', 'Decimal', 'Float'],
  ts: ['pgTable', 'uuid', 'text', 'serial', 'integer', 'boolean', 'timestamp', 'varchar', 'bigint'],
  dbml: ['uuid', 'text', 'serial', 'integer', 'boolean', 'timestamptz', 'varchar', 'bigint', 'bigserial', 'numeric'],
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Tiny, dependency-free syntax colouring for the marketing and docs code panels (not for the editor). */
export function Highlighted({ code, lang }: { code: string; lang: CodeLang }): ReactNode {
  const kw = KEYWORDS[lang].map(escape).join('|');
  const ty = TYPES[lang].map(escape).join('|');
  const re = new RegExp(
    `(--[^\\n]*|//[^\\n]*)|("[^"\\n]*"|'[^'\\n]*')|(@@?[A-Za-z]+)|\\b(${kw})\\b|\\b(${ty})\\b`,
    lang === 'sql' ? 'gi' : 'g',
  );
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push(<Fragment key={`t${i++}`}>{code.slice(last, m.index)}</Fragment>);
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] || m[4] ? 'k' : 't';
    out.push(<span key={`s${i++}`} className={cls}>{m[0]}</span>);
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (last < code.length) out.push(<Fragment key={`t${i++}`}>{code.slice(last)}</Fragment>);
  return out;
}

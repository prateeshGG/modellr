import type { Table } from '../../types/schema';

const MONO = "'Geist Mono Variable','Geist Mono',ui-monospace,monospace";

interface Row { name: string; key: 'PK' | 'FK' | '' }

function rowsOf(t: Pick<Table, 'fields'>, max = 3): Row[] {
  const rank = (f: Table['fields'][number]) => (f.isPK ? 0 : f.isFK ? 1 : 2);
  return [...t.fields]
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, max)
    .map((f) => ({ name: f.name, key: f.isPK ? 'PK' : f.isFK ? 'FK' : '' }));
}

function Tbl({ x, y, name, rows, w }: { x: number; y: number; name: string; rows: Row[]; w: number }) {
  const h = 30 + rows.length * 17;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx={6} fill="var(--n-surface-2)" stroke="var(--n-line-3)" />
      <path d={`M0 22H${w}`} stroke="var(--n-line-2)" />
      <text x={9} y={15} fill="var(--n-text)" fontFamily={MONO} fontSize={10} fontWeight={600}>{name.length > 14 ? `${name.slice(0, 13)}…` : name}</text>
      {rows.map((r, i) => (
        <g key={r.name}>
          <text x={9} y={39 + i * 17} fill="var(--n-text-2)" fontFamily={MONO} fontSize={9.5}>{r.name.length > 13 ? `${r.name.slice(0, 12)}…` : r.name}</text>
          {r.key && (
            <text x={w - 9} y={39 + i * 17} textAnchor="end" fill={r.key === 'PK' ? 'var(--n-amber)' : 'var(--n-blue)'} fontFamily={MONO} fontSize={8.5} fontWeight={600}>{r.key}</text>
          )}
        </g>
      ))}
    </g>
  );
}

/** Small decorative diagram of the first three tables of a schema (names and keys are real). */
export function MiniSchema({ tables, label, className }: { tables: Pick<Table, 'name' | 'fields'>[]; label?: string; className?: string }) {
  const [a, b, c] = tables;
  if (!a) return null;
  return (
    <svg className={className} viewBox="0 0 360 190" role="img" aria-label={label ?? `Diagram of ${tables.slice(0, 3).map((t) => t.name).join(', ')}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {b && <path d="M126 62 C 170 62, 160 124, 200 124" fill="none" stroke="var(--n-accent)" strokeWidth={1.5} />}
      {c && <path d="M126 84 C 200 84, 200 40, 244 40" fill="none" stroke="var(--n-text-3)" strokeWidth={1.2} strokeDasharray="4 3" />}
      <Tbl x={14} y={28} name={a.name} rows={rowsOf(a)} w={112} />
      {b && <Tbl x={200} y={92} name={b.name} rows={rowsOf(b)} w={112} />}
      {c && <Tbl x={244} y={14} name={c.name} rows={rowsOf(c)} w={100} />}
    </svg>
  );
}

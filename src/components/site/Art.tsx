/** Isometric line drawings used on the marketing pages. Decorative: the accent stroke is the "relationship". */
const plate = (cx: number, cy: number, w: number, h: number, t = 8) =>
  `M${cx} ${cy - h}L${cx + w} ${cy}L${cx} ${cy + h}L${cx - w} ${cy}Z M${cx - w} ${cy}v${t}l${w} ${h}l${w} -${h}v-${t}M${cx} ${cy + h}v${t}`;
const cube = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy - s}L${cx + s * 0.87} ${cy - s / 2}V${cy + s / 2}L${cx} ${cy + s}L${cx - s * 0.87} ${cy + s / 2}V${cy - s / 2}Z M${cx} ${cy}V${cy + s}M${cx} ${cy}L${cx - s * 0.87} ${cy - s / 2}M${cx} ${cy}L${cx + s * 0.87} ${cy - s / 2}`;

const base = { viewBox: '0 0 320 200', fill: 'none', stroke: 'currentColor', strokeWidth: 1, strokeLinejoin: 'round' as const, role: 'img' as const };

export function ArtStack() {
  return (
    <svg {...base} aria-label="Stacked layers drawing">
      <path d={plate(160, 128, 78, 39)} />
      <path d={plate(160, 100, 78, 39)} />
      <path d={plate(160, 72, 78, 39)} />
      <path d="M138 60 L160 71 L182 60 M160 71 V112" stroke="var(--n-accent)" strokeWidth={1.5} />
      <circle cx={160} cy={71} r={3} fill="var(--n-accent)" stroke="none" />
    </svg>
  );
}

export function ArtCubes() {
  return (
    <svg {...base} aria-label="Linked cubes drawing">
      <path d={cube(110, 118, 34)} /><path d={cube(190, 92, 34)} /><path d={cube(214, 150, 30)} /><path d={cube(104, 62, 22)} />
      <path d="M128 100 L172 108 M196 120 L206 128 M120 76 L170 86" stroke="var(--n-accent)" strokeWidth={1.5} strokeDasharray="3 3" />
    </svg>
  );
}

export function ArtBars() {
  const cells: string[] = [];
  let hot = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const x = 160 + (c - r) * 34, y = 60 + (c + r) * 17, h = 6 + ((r * 7 + c * 5) % 5) * 7;
      const d = `M${x} ${y - h - 16}L${x + 30} ${y - h}L${x} ${y - h + 16}L${x - 30} ${y - h}Z M${x - 30} ${y - h}V${y}L${x} ${y + 16}L${x + 30} ${y}V${y - h}M${x} ${y + 16}V${y - h + 16}`;
      if (r === 1 && c === 2) hot = d; else cells.push(d);
    }
  }
  return (
    <svg {...base} strokeWidth={0.9} aria-label="Isometric bars drawing">
      <g opacity={0.85}>{cells.map((d, i) => <path key={i} d={d} />)}</g>
      <path d={hot} stroke="var(--n-accent)" strokeWidth={1.5} />
    </svg>
  );
}

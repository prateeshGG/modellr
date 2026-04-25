import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicNav } from '../../components/layout/PublicNav';
import { Footer } from '../../components/layout/Footer';
import { Check, X, ArrowRight, Bot, Code2, Sparkles, LayoutTemplate } from 'lucide-react';
import '../../styles/public-dark.css';

const REASONS = [
  {
    icon: <LayoutTemplate size={20} />,
    title: '1. From static diagrams → interactive workflows',
    body: 'dbdiagram is primarily code-first with limited interaction. You get diagrams — but not a full design workflow.',
    points: ['visually design', 'write code', 'generate with AI'],
    suffix: '— all in sync.',
  },
  {
    icon: <Code2 size={20} />,
    title: '2. Built for modern stacks',
    body: 'dbdiagram focuses on DBML and SQL. Modern developers use Prisma and Drizzle.',
    points: ['Export directly to Prisma', 'Export directly to Drizzle', 'No manual rewriting'],
    suffix: null,
  },
  {
    icon: <Sparkles size={20} />,
    title: '3. AI that actually builds schemas',
    body: "dbdiagram doesn't help you design. Modellr lets you:",
    points: ['generate full schemas from prompts', 'modify tables using AI', 'analyze relationships automatically'],
    suffix: null,
  },
];

const TABLE_ROWS: [string, React.ReactNode, React.ReactNode][] = [
  ['Visual editor',        'Limited',                                    'Advanced canvas'],
  ['Code editor (DBML)',   <Check size={15} className="pd-check" />,     <Check size={15} className="pd-check" />],
  ['AI schema generation', <X size={15} className="pd-x" />,             <Check size={15} className="pd-check" />],
  ['AI modify schema',     <X size={15} className="pd-x" />,             <Check size={15} className="pd-check" />],
  ['Prisma export',        <X size={15} className="pd-x" />,             <Check size={15} className="pd-check" />],
  ['Drizzle export',       <X size={15} className="pd-x" />,             <Check size={15} className="pd-check" />],
  ['Auto layout',          'Basic',                                      'Advanced'],
  ['Collaboration',        'Limited',                                    'Real-time'],
  ['Version history',      <Check size={15} className="pd-check" />,     <Check size={15} className="pd-check" />],
];

export function DbdiagramCompare() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'dbdiagram vs Modellr: Which is better in 2026?';
    let meta = document.querySelector('meta[name="keywords"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'keywords'); document.head.appendChild(meta); }
    meta.setAttribute('content', 'dbdiagram alternative, database design tool prisma, ai database schema generator');
  }, []);

  return (
    <div className="pd-root">
      <PublicNav dark />

      {/* ── Hero ── */}
      <div className="pd-hero" style={{ paddingTop: '140px' }}>
        <div className="pd-hero-dot-grid" aria-hidden />
        <div className="pd-hero-glow" aria-hidden />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="pd-label">// Compare</div>
          <h1 className="pd-h1">dbdiagram vs Modellr</h1>
          <p className="pd-lead">dbdiagram is great for simple diagrams. But modern workflows need more than static DBML.</p>
          <div className="pd-hero-actions">
            <button className="pd-btn-primary" onClick={() => navigate('/login')}>Try it free →</button>
          </div>
        </div>
      </div>

      {/* ── Why switch ── */}
      <section className="pd-section">
        <div className="pd-inner">
          <div className="pd-label">// Why developers are moving beyond dbdiagram</div>
          <h2 className="pd-h2">Three reasons to switch</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {REASONS.map((r, i) => (
              <div key={i} className="pd-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span className="pd-card__icon" style={{ marginBottom: 0 }}>{r.icon}</span>
                    <h3 className="pd-h3" style={{ margin: 0 }}>{r.title}</h3>
                  </div>
                  <p className="pd-body-text" style={{ marginBottom: '12px' }}>{r.body}</p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {r.points.map(p => (
                      <li key={p} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px', color: 'var(--pd-muted)' }}>
                        <ArrowRight size={14} style={{ color: 'var(--pd-brand)', flexShrink: 0 }} /> {p}
                      </li>
                    ))}
                  </ul>
                  {r.suffix && <p style={{ fontFamily: 'var(--pd-mono)', color: 'var(--pd-accent)', fontWeight: 700, marginTop: '12px', fontSize: '13px' }}>{r.suffix}</p>}
                </div>
                <div className="pd-code-block" style={{ textAlign: 'center', color: 'var(--pd-muted)', fontSize: '13px' }}>
                  {r.title.split('. ')[1]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who should use what ── */}
      <section className="pd-section--alt">
        <div className="pd-inner" style={{ maxWidth: '760px' }}>
          <div className="pd-label">// Decision guide</div>
          <h2 className="pd-h2">Who should use what?</h2>
          <div className="pd-grid-2">
            <div className="pd-card">
              <h3 className="pd-h3">Use dbdiagram if:</h3>
              <p className="pd-body-text">you only need basic DBML diagrams.</p>
            </div>
            <div className="pd-card pd-card--brand">
              <h3 className="pd-h3" style={{ color: 'var(--pd-brand)' }}>Use Modellr if:</h3>
              <p className="pd-body-text">you want AI generation, modern workflow sync, and direct Prisma/Drizzle exports.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature comparison ── */}
      <section className="pd-section">
        <div className="pd-inner" style={{ maxWidth: '860px' }}>
          <div className="pd-label">// Feature comparison</div>
          <h2 className="pd-h2">Side by side</h2>
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="center muted">dbdiagram</th>
                  <th className="center brand">Modellr</th>
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map(([label, left, right], i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--pd-text)', fontWeight: 500 }}>{label}</td>
                    <td className="center">{left}</td>
                    <td className="center strong">{right}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Demo prompt ── */}
      <section className="pd-section--alt">
        <div className="pd-inner--narrow" style={{ textAlign: 'center' }}>
          <div className="pd-label">// See the difference</div>
          <h2 className="pd-h2">Instead of writing everything manually, just describe your system:</h2>
          <div className="pd-prompt-pill" style={{ margin: '0 auto 28px', display: 'inline-flex' }}>
            <Bot size={16} style={{ color: 'var(--pd-brand)' }} />
            <code>"Build a SaaS schema with users, billing, and analytics"</code>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            {['Full schema generated instantly', 'Relationships mapped automatically', 'Ready to export to Prisma or Drizzle'].map(p => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--pd-muted)' }}>
                <ArrowRight size={14} style={{ color: 'var(--pd-brand)' }} /> {p}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="pd-cta pd-section">
        <div className="pd-cta-glow-l" aria-hidden />
        <div className="pd-cta-glow-r" aria-hidden />
        <div className="pd-cta-inner">
          <h2 className="pd-cta-h2">Not just diagrams — a complete workflow</h2>
          <p className="pd-cta-sub">Modellr helps you design, generate, and ship.</p>
          <button className="pd-btn-primary" onClick={() => navigate('/login')}>Start building free →</button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicNav } from '../../components/layout/PublicNav';
import { Footer } from '../../components/layout/Footer';
import { Check, X, ArrowRight, Bot, PenTool, Focus, Workflow } from 'lucide-react';
import '../../styles/public-dark.css';

const REASONS = [
  {
    icon: <PenTool size={20} />,
    title: '1. No more manual diagram building',
    body: 'DrawSQL requires manual effort: adding tables, connecting relationships, organizing layout.',
    points: ['Auto table creation', 'Auto relationship mapping', 'Auto layout engine'],
    suffix: 'Modellr automates all of that.',
  },
  {
    icon: <Bot size={20} />,
    title: '2. AI-first workflow',
    body: 'Instead of building schemas manually, you can:',
    points: ['generate entire systems from prompts', 'modify existing schemas with AI', 'detect missing relationships automatically'],
    suffix: null,
  },
  {
    icon: <Focus size={20} />,
    title: '3. Code + visual in sync',
    body: 'DrawSQL is visual-first only. Here, you can:',
    points: ['write DBML or SQL', 'see instant visual updates', 'switch seamlessly between both'],
    suffix: null,
  },
  {
    icon: <Workflow size={20} />,
    title: '4. Built for developers',
    body: 'DrawSQL focuses on visuals. This platform focuses on:',
    points: ['real development workflows', 'ORM exports (Prisma, Drizzle)', 'production-ready schemas'],
    suffix: null,
  },
];

const TABLE_ROWS: [string, React.ReactNode, React.ReactNode][] = [
  ['Visual editor',        <Check size={15} className="pd-check" />,  <Check size={15} className="pd-check" />],
  ['Code editor',          <X size={15} className="pd-x" />,          <Check size={15} className="pd-check" />],
  ['AI schema generation', <X size={15} className="pd-x" />,          <Check size={15} className="pd-check" />],
  ['AI modify schema',     <X size={15} className="pd-x" />,          <Check size={15} className="pd-check" />],
  ['Prisma export',        <X size={15} className="pd-x" />,          <Check size={15} className="pd-check" />],
  ['Drizzle export',       <X size={15} className="pd-x" />,          <Check size={15} className="pd-check" />],
  ['Auto layout',          'Limited',                                  'Advanced'],
  ['Collaboration',        <Check size={15} className="pd-check" />,  <Check size={15} className="pd-check" />],
  ['Version history',      <Check size={15} className="pd-check" />,  <Check size={15} className="pd-check" />],
];

export function DrawsqlCompare() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'DrawSQL alternative for modern developers';
    let meta = document.querySelector('meta[name="keywords"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'keywords'); document.head.appendChild(meta); }
    meta.setAttribute('content', 'drawsql alternative, database design tool prisma, ai database schema generator');
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
          <h1 className="pd-h1">DrawSQL vs Modellr</h1>
          <p className="pd-lead">DrawSQL is great for visual diagrams. But modern development needs more than drag-and-drop.</p>
          <div className="pd-hero-actions">
            <button className="pd-btn-primary" onClick={() => navigate('/login')}>Try it free →</button>
          </div>
        </div>
      </div>

      {/* ── Why switch ── */}
      <section className="pd-section">
        <div className="pd-inner">
          <div className="pd-label">// Why developers are switching from DrawSQL</div>
          <h2 className="pd-h2">Four reasons to switch</h2>
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
              <h3 className="pd-h3">Use DrawSQL if:</h3>
              <p className="pd-body-text">you only need to draw basic visual diagrams manually.</p>
            </div>
            <div className="pd-card pd-card--brand">
              <h3 className="pd-h3" style={{ color: 'var(--pd-brand)' }}>Use Modellr if:</h3>
              <p className="pd-body-text">you want AI generation, a synced code editor, and actual code-ready exports.</p>
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
                  <th className="center muted">DrawSQL</th>
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
          <div className="pd-label">// Build in seconds</div>
          <h2 className="pd-h2">Describe what you need:</h2>
          <div className="pd-prompt-pill" style={{ margin: '0 auto 28px', display: 'inline-flex' }}>
            <Bot size={16} style={{ color: 'var(--pd-brand)' }} />
            <code>"E-commerce schema with carts, orders, and payments"</code>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            {['Complete schema generated instantly', 'Fully structured relationships', 'Ready to export and use'].map(p => (
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
          <h2 className="pd-cta-h2">Stop drawing. Start building.</h2>
          <p className="pd-cta-sub">Modellr helps you generate real systems.</p>
          <button className="pd-btn-primary" onClick={() => navigate('/login')}>Start building free →</button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

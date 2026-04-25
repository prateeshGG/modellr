import { useNavigate } from 'react-router-dom';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import { Bot, Users, ExternalLink, Database, Shield, History } from 'lucide-react';
import '../styles/public-dark.css';

const FEATURES = [
  {
    icon: <Bot size={24} />,
    title: 'AI Schema Generation',
    comment: '// describe → generate',
    body: 'Describe your application in plain natural language. Our specialized LLM pipeline instantly spins up the corresponding relational tables, assigns primary and foreign keys, and maps out one-to-many relationships logically and accurately.',
  },
  {
    icon: <Users size={24} />,
    title: 'Real-time Collaboration',
    comment: '// multiplayer editing',
    body: 'Powered by Yjs CRDTs, Modellr enables true multiplayer editing. Invite your backend team and watch their live cursors fly around the canvas. All edits synchronize natively in milliseconds with zero merge conflicts.',
  },
  {
    icon: <ExternalLink size={24} />,
    title: 'Intelligent Exporting',
    comment: '// export --format=prisma',
    body: 'Your visual design isn\'t locked in. Export as generic SQL DDL, schema.prisma files, Drizzle ORM mappings, or DBML. Generate ALTER TABLE diff migrations instantly.',
  },
  {
    icon: <Database size={24} />,
    title: 'Live DB Introspection',
    comment: '// import --from=postgres',
    body: 'Already have a deployed Postgres database? Paste a secure read-only connection string into our Live Import tool, and watch Modellr automatically reverse-engineer your information_schema into a beautiful, fully laid-out visual canvas.',
  },
  {
    icon: <Shield size={24} />,
    title: 'Zero-Trust Auth & RBAC',
    comment: '// share --role=viewer',
    body: 'Share schemas securely. Invite clients or stakeholders as Viewers using simple magic links. Our robust zero-trust layer ensures that read-only guests can navigate the canvas but cannot mutate your production structures.',
  },
  {
    icon: <History size={24} />,
    title: 'Unlimited Snapshots',
    comment: '// git diff schema@v3 schema@v4',
    body: 'Experiment fearlessly. Every major architectural shift you make is securely tracked. Point-in-time time travel lets you instantly restore or abandon massive sweeping layout changes with one click.',
  },
];

export function Features() {
  const navigate = useNavigate();

  return (
    <div className="pd-root">
      <PublicNav dark />

      {/* ── Hero ── */}
      <div className="pd-hero" style={{ paddingTop: '140px' }}>
        <div className="pd-hero-dot-grid" aria-hidden />
        <div className="pd-hero-glow" aria-hidden />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="pd-label">// Features</div>
          <h1 className="pd-h1">Database Design,{' '}
            <span style={{ WebkitTextStroke: '1.5px var(--pd-text)', WebkitTextFillColor: 'transparent', fontStyle: 'italic' }}>
              Redefined.
            </span>
          </h1>
          <p className="pd-lead">
            Everything you need to architect, collaborate, and deploy robust database structures instantly.
          </p>
        </div>
      </div>

      {/* ── Feature cards ── */}
      <section className="pd-section">
        <div className="pd-inner--wide">
          <div className="pd-grid-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="pd-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="pd-card__icon" style={{ marginBottom: 0 }}>{f.icon}</span>
                  <span style={{ fontFamily: 'var(--pd-mono)', fontSize: '11px', color: 'var(--pd-muted)' }}>{f.comment}</span>
                </div>
                <h3 className="pd-h3" style={{ fontSize: '18px' }}>{f.title}</h3>
                <p className="pd-body-text" style={{ fontSize: '14px' }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="pd-cta pd-section--alt">
        <div className="pd-cta-glow-l" aria-hidden />
        <div className="pd-cta-glow-r" aria-hidden />
        <div className="pd-cta-inner">
          <h2 className="pd-cta-h2">Ready to optimize your workflow?</h2>
          <p className="pd-cta-sub">Free forever. No credit card required to start.</p>
          <button className="pd-btn-primary" onClick={() => navigate('/login')}>Start building free →</button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

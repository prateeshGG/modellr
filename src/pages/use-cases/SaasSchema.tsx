import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicNav } from '../../components/layout/PublicNav';
import { Footer } from '../../components/layout/Footer';
import { Database, Users, CreditCard, Box, Zap, ArrowRight, LayoutTemplate } from 'lucide-react';
import '../../styles/public-dark.css';

export function SaasSchema() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'SaaS Database Schema Example (Free Template)';
    let meta = document.querySelector('meta[name="keywords"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'keywords'); document.head.appendChild(meta); }
    meta.setAttribute('content', 'saas database schema');
  }, []);

  return (
    <div className="pd-root">
      <PublicNav dark />

      {/* ── Hero ── */}
      <div className="pd-hero" style={{ paddingTop: '140px' }}>
        <div className="pd-hero-dot-grid" aria-hidden />
        <div className="pd-hero-glow" aria-hidden />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="pd-hero-badge"><LayoutTemplate size={13} /> Official Schema Template</div>
          <h1 className="pd-h1">SaaS Database Schema</h1>
          <p className="pd-lead">A production-ready SaaS schema with users, billing, subscriptions, and analytics — ready to use or customize.</p>
          <div className="pd-hero-actions">
            <button className="pd-btn-primary" onClick={() => navigate('/login')}>Use this schema →</button>
          </div>
        </div>
      </div>

      {/* ── Problem ── */}
      <section className="pd-section--alt">
        <div className="pd-inner--narrow">
          <div className="pd-label">// The challenge</div>
          <h2 className="pd-h2">Designing a SaaS database is harder than it looks</h2>
          <p className="pd-body-text" style={{ marginBottom: '24px' }}>Most SaaS applications need the same core systems:</p>
          <div className="pd-grid-2">
            {['User authentication', 'Subscriptions and billing', 'Teams or organizations', 'Usage tracking'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--pd-text)' }}>
                <ArrowRight size={14} style={{ color: 'var(--pd-brand)', flexShrink: 0 }} /> {item}
              </div>
            ))}
          </div>
          <p style={{ fontFamily: 'var(--pd-mono)', color: 'var(--pd-accent)', fontWeight: 600, marginTop: '24px', fontSize: '13px' }}>
            Small mistakes here lead to painful refactors later.
          </p>
        </div>
      </section>

      {/* ── Visual schema ── */}
      <section className="pd-section">
        <div className="pd-inner">
          <div className="pd-label">// Schema preview</div>
          <h2 className="pd-h2">How this schema is structured</h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '40px' }}>
            {[
              { icon: <Users size={14} />, name: 'Users', fields: ['id (PK)', 'email', 'org_id (FK)'] },
              null,
              { icon: <Box size={14} />, name: 'Organizations', fields: ['id (PK)', 'name', 'stripe_customer_id'] },
              null,
              { icon: <CreditCard size={14} />, name: 'Subscriptions', fields: ['id (PK)', 'org_id (FK)', 'status'] },
            ].map((item, i) =>
              item === null
                ? <div key={i} className="pd-connector" />
                : (
                  <div key={item.name} className="pd-schema-table">
                    <div className="pd-schema-table__header">
                      <span style={{ color: 'var(--pd-brand)' }}>{item.icon}</span> {item.name}
                    </div>
                    {item.fields.map(f => <div key={f} className="pd-schema-table__row">{f}</div>)}
                  </div>
                )
            )}
          </div>
          <p style={{ textAlign: 'center', fontFamily: 'var(--pd-mono)', fontSize: '12px', color: 'var(--pd-muted)' }}>
            Users → Organizations → Subscriptions — the SaaS core.
          </p>
        </div>
      </section>

      {/* ── Explanation ── */}
      <section className="pd-section--alt">
        <div className="pd-inner">
          <div className="pd-grid-2">
            <div>
              <div className="pd-label">// Core tables</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { icon: <Users size={18} />, name: 'Users', desc: 'Stores authentication and profile data. Linked to organizations or workspaces.' },
                  { icon: <Box size={18} />, name: 'Organizations / Teams', desc: 'Enables multi-tenant architecture. Users can belong to multiple teams.' },
                  { icon: <CreditCard size={18} />, name: 'Subscriptions', desc: 'Tracks billing plans and status. Linked to Stripe or payment provider.' },
                  { icon: <Database size={18} />, name: 'Products / Plans', desc: 'Defines pricing tiers.' },
                  { icon: <Zap size={18} />, name: 'Usage / Events', desc: 'Tracks feature usage for metering.' },
                ].map(t => (
                  <div key={t.name} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--pd-brand)', flexShrink: 0, marginTop: '2px' }}>{t.icon}</span>
                    <div>
                      <div style={{ fontFamily: 'var(--pd-display)', fontWeight: 700, color: 'var(--pd-text)', marginBottom: '4px' }}>{t.name}</div>
                      <div className="pd-body-text" style={{ fontSize: '13px' }}>{t.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="pd-label">// Relationships</div>
              <div className="pd-card">
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    'A user can belong to multiple organizations',
                    'An organization has one active subscription',
                    'Subscriptions map to plans',
                    'Usage is tracked per organization or user',
                  ].map(r => (
                    <li key={r} style={{ display: 'flex', gap: '10px', fontSize: '14px', color: 'var(--pd-muted)' }}>
                      <span style={{ color: 'var(--pd-brand)' }}>✓</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ marginTop: '24px' }}>
                <h3 className="pd-h3">Avoid costly mistakes early</h3>
                <p className="pd-body-text">A poorly designed SaaS schema leads to billing inconsistencies, broken permissions, and hard-to-scale systems. Starting with a solid structure saves hours of rework later.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="pd-cta pd-section">
        <div className="pd-cta-glow-l" aria-hidden />
        <div className="pd-cta-glow-r" aria-hidden />
        <div className="pd-cta-inner">
          <h2 className="pd-cta-h2">Start with this schema — customize it in seconds.</h2>
          <p className="pd-cta-sub">Generate, modify, and export to Prisma or Drizzle instantly.</p>
          <button className="pd-btn-primary" onClick={() => navigate('/login')}>Open in editor →</button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

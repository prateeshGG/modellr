import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicNav } from '../../components/layout/PublicNav';
import { Footer } from '../../components/layout/Footer';
import { Users, Shield, Key, Lock, ArrowRight, LayoutTemplate } from 'lucide-react';
import '../../styles/public-dark.css';

export function AuthSchema() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Authentication Database Schema Example (Free Template)';
    let meta = document.querySelector('meta[name="keywords"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'keywords'); document.head.appendChild(meta); }
    meta.setAttribute('content', 'auth database schema');
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
          <h1 className="pd-h1">Authentication Database Schema</h1>
          <p className="pd-lead">A flexible auth schema supporting sessions, roles, and permissions.</p>
          <div className="pd-hero-actions">
            <button className="pd-btn-primary" onClick={() => navigate('/login')}>Use this schema →</button>
          </div>
        </div>
      </div>

      {/* ── Problem ── */}
      <section className="pd-section--alt">
        <div className="pd-inner--narrow">
          <div className="pd-label">// The challenge</div>
          <h2 className="pd-h2">Auth is easy — until it isn't</h2>
          <p className="pd-body-text" style={{ marginBottom: '24px' }}>Basic login is simple. But real-world systems need:</p>
          <div className="pd-grid-2">
            {['sessions', 'roles and permissions', 'OAuth support', 'secure token handling'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--pd-text)' }}>
                <ArrowRight size={14} style={{ color: 'var(--pd-brand)', flexShrink: 0 }} /> {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Visual schema ── */}
      <section className="pd-section">
        <div className="pd-inner">
          <div className="pd-label">// Schema preview</div>
          <h2 className="pd-h2">How this schema is structured</h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '40px' }}>
            {[
              { icon: <Users size={14} />, name: 'Users', fields: ['id (PK)', 'email', 'password_hash'] },
              null,
              { icon: <Shield size={14} />, name: 'Roles', fields: ['id (PK)', 'name', 'description'] },
              null,
              { icon: <Key size={14} />, name: 'Sessions', fields: ['id (PK)', 'user_id (FK)', 'expires_at'] },
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
            Users → Roles → Sessions — the auth core.
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
                  { icon: <Users size={18} />, name: 'Users', desc: 'Account details.' },
                  { icon: <Key size={18} />, name: 'Sessions', desc: 'Active logins.' },
                  { icon: <Shield size={18} />, name: 'Roles', desc: 'Access levels.' },
                  { icon: <Lock size={18} />, name: 'Permissions', desc: 'Fine-grained control.' },
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
                  {['Users can have multiple roles (via UserRoles binding)', 'Roles map to permissions', 'Sessions belong to users'].map(r => (
                    <li key={r} style={{ display: 'flex', gap: '10px', fontSize: '14px', color: 'var(--pd-muted)' }}>
                      <span style={{ color: 'var(--pd-brand)' }}>✓</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ marginTop: '24px' }}>
                <h3 className="pd-h3">Build secure authentication from the start</h3>
                <p className="pd-body-text">Weak auth design leads to security vulnerabilities, broken permissions, and scaling issues.</p>
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
          <h2 className="pd-cta-h2">Build secure authentication from the start.</h2>
          <p className="pd-cta-sub">Generate, modify, and export to Prisma or Drizzle instantly.</p>
          <button className="pd-btn-primary" onClick={() => navigate('/login')}>Open in editor →</button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

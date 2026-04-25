import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import { Check, X, Bot, ExternalLink, Zap, Users } from 'lucide-react';
import '../styles/public-dark.css';

export function Pricing() {
  const navigate = useNavigate();
  const { session } = useAuthStore();

  const go = () => navigate(session ? '/app' : '/login');

  return (
    <div className="pd-root">
      <PublicNav dark />

      {/* ── Hero ── */}
      <div className="pd-hero" style={{ paddingTop: '140px' }}>
        <div className="pd-hero-dot-grid" aria-hidden />
        <div className="pd-hero-glow" aria-hidden />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="pd-label">// Pricing</div>
          <h1 className="pd-h1">Simple pricing for builders</h1>
          <p className="pd-lead">Start free. Upgrade when you need more power, AI, and exports.</p>
          <p className="pd-hero-footnote" style={{ marginTop: '12px' }}>No credit card required · Cancel anytime</p>
        </div>
      </div>

      {/* ── Pricing cards ── */}
      <section className="pd-section">
        <div className="pd-inner" style={{ maxWidth: '860px' }}>
          <div className="pd-grid-2">

            {/* Free */}
            <div className="pd-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontFamily: 'var(--pd-display)', fontSize: '22px', fontWeight: 800, color: 'var(--pd-text)', marginBottom: '4px' }}>Free</div>
              <div style={{ fontFamily: 'var(--pd-mono)', fontSize: '36px', fontWeight: 700, color: 'var(--pd-text)', margin: '8px 0 4px' }}>
                $0<span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--pd-muted)' }}>/mo</span>
              </div>
              <div style={{ fontSize: '14px', color: 'var(--pd-muted)', marginBottom: '28px' }}>Start building instantly.</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {['Unlimited canvas editing', 'Up to 3 saved schemas', 'SQL & DBML exports', '10 AI generations per day', 'Guest sandbox access'].map(f => (
                  <li key={f} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px', color: 'var(--pd-text)' }}>
                    <Check size={15} className="pd-check" /> {f}
                  </li>
                ))}
              </ul>
              <button className="pd-btn-outline" style={{ width: '100%' }} onClick={go}>Start building free</button>
            </div>

            {/* Pro */}
            <div className="pd-card pd-card--brand" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-13px', right: '24px', background: 'var(--pd-brand)', color: '#fff', fontFamily: 'var(--pd-mono)', fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px', letterSpacing: '0.08em' }}>MOST POPULAR</div>
              <div style={{ fontFamily: 'var(--pd-display)', fontSize: '22px', fontWeight: 800, color: 'var(--pd-brand)', marginBottom: '4px' }}>Pro</div>
              <div style={{ fontFamily: 'var(--pd-mono)', fontSize: '36px', fontWeight: 700, color: 'var(--pd-text)', margin: '8px 0 4px' }}>
                $15<span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--pd-muted)' }}>/mo</span>
              </div>
              <div style={{ fontSize: '14px', color: 'var(--pd-brand)', marginBottom: '28px' }}>Everything you need to ship faster.</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {['Unlimited schemas', 'Prisma & Drizzle exports', 'Unlimited AI chat-to-modify', 'Up to 200 AI generations per day', 'Version history (50 snapshots)', 'Real-time collaboration (up to 10 users)', 'Priority performance'].map(f => (
                  <li key={f} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px', color: 'var(--pd-text)' }}>
                    <Check size={15} className="pd-check" /> {f}
                  </li>
                ))}
              </ul>
              <button className="pd-btn-primary" style={{ width: '100%' }} onClick={go}>Upgrade to Pro</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Value justification ── */}
      <section className="pd-section--alt">
        <div className="pd-inner--narrow" style={{ textAlign: 'center' }}>
          <div className="pd-label">// ROI</div>
          <h2 className="pd-h2">Built to save you hours every week</h2>
          <p className="pd-body-text" style={{ marginBottom: '16px' }}>Designing a database shouldn't take hours of switching between tools, fixing relationships, and rewriting schemas.</p>
          <p className="pd-body-text" style={{ marginBottom: '16px' }}>This platform helps you generate, refine, and export production-ready schemas in minutes.</p>
          <p style={{ fontFamily: 'var(--pd-mono)', fontWeight: 700, color: 'var(--pd-accent)', marginTop: '24px', fontSize: '16px' }}>
            If it saves you even 2–3 hours on a single project, it pays for itself.
          </p>
        </div>
      </section>

      {/* ── Comparison table ── */}
      <section className="pd-section">
        <div className="pd-inner" style={{ maxWidth: '860px' }}>
          <div className="pd-label" style={{ textAlign: 'center' }}>// Compare plans</div>
          <h2 className="pd-h2" style={{ textAlign: 'center' }}>Feature breakdown</h2>
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th className="center muted">Free</th>
                  <th className="center brand">Pro</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Canvas editing',       <Check size={16} className="pd-check" />, <Check size={16} className="pd-check" />],
                  ['Saved schemas',        '3',                                       'Unlimited'],
                  ['SQL export',           <Check size={16} className="pd-check" />, <Check size={16} className="pd-check" />],
                  ['DBML export',          <Check size={16} className="pd-check" />, <Check size={16} className="pd-check" />],
                  ['Prisma export',        <X size={16} className="pd-x" />,         <Check size={16} className="pd-check" />],
                  ['Drizzle export',       <X size={16} className="pd-x" />,         <Check size={16} className="pd-check" />],
                  ['AI generation',        '10 / day',                               '200 / day'],
                  ['AI chat-to-modify',    'Limited',                                'Unlimited'],
                  ['Version history',      <X size={16} className="pd-x" />,         <Check size={16} className="pd-check" />],
                  ['Collaboration',        <X size={16} className="pd-x" />,         'Up to 10 users'],
                ].map(([label, free, pro], i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--pd-text)', fontWeight: 500 }}>{label}</td>
                    <td className="center">{free}</td>
                    <td className="center strong">{pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Why upgrade ── */}
      <section className="pd-section--alt">
        <div className="pd-inner">
          <div className="pd-label">// Why upgrade?</div>
          <h2 className="pd-h2">Four reasons to go Pro</h2>
          <div className="pd-grid-2">
            {[
              { icon: <Bot size={22} />, title: 'Faster workflow', desc: 'Generate and modify schemas instantly with AI.' },
              { icon: <ExternalLink size={22} />, title: 'Modern stack support', desc: 'Export directly to Prisma and Drizzle without manual rewriting.' },
              { icon: <Zap size={22} />, title: 'No limitations', desc: 'Work on unlimited projects without hitting caps.' },
              { icon: <Users size={22} />, title: 'Collaboration', desc: 'Share and explain your architecture with your team or clients.' },
            ].map((item, i) => (
              <div key={i} className="pd-card">
                <div className="pd-card__icon">{item.icon}</div>
                <h3 className="pd-h3">{item.title}</h3>
                <p className="pd-body-text">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="pd-section">
        <div className="pd-inner--narrow">
          <div className="pd-label">// FAQ</div>
          <h2 className="pd-h2">Frequently asked questions</h2>
          <div className="pd-faq">
            {[
              ['Do I need a credit card to start?', 'No. You can start using the product for free without entering any payment details.'],
              ['Can I cancel anytime?', "Yes. You can cancel your subscription at any time. You'll continue to have access until the end of your billing period."],
              ['What happens if I hit the AI limit?', "On the free plan, you'll need to wait until the next day. Pro users get significantly higher limits for uninterrupted workflows."],
              ['Is this a replacement for my database?', 'No. This is a design and architecture tool. You generate schemas and export them to your actual database or ORM.'],
              ['Do you support teams?', 'Yes. The Pro plan includes collaboration features for up to 10 users per project.'],
              ['Do you connect to my database?', 'No. This tool focuses on schema design and code generation, without direct database access—keeping things fast and secure.'],
            ].map(([q, a], i) => (
              <div key={i} className="pd-faq-item">
                <p className="pd-faq-q">{i + 1}. {q}</p>
                <p className="pd-faq-a">{a}</p>
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
          <h2 className="pd-cta-h2">Start designing your database today</h2>
          <p className="pd-cta-sub">No setup. No friction. Just build.</p>
          <button className="pd-btn-primary" onClick={go}>Start building free →</button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

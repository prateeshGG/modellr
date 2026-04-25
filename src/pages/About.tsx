import { useNavigate } from 'react-router-dom';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import { Zap, Code2, Database, Bot, CheckCircle2 } from 'lucide-react';
import '../styles/public-dark.css';

export function About() {
  const navigate = useNavigate();

  return (
    <div className="pd-root">
      <PublicNav dark />

      {/* ── Hero ── */}
      <div className="pd-hero" style={{ paddingTop: '140px' }}>
        <div className="pd-hero-dot-grid" aria-hidden />
        <div className="pd-hero-glow" aria-hidden />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="pd-label">// About</div>
          <h1 className="pd-h1">
            Built for developers who{' '}
            <span style={{ WebkitTextStroke: '1.5px var(--pd-text)', WebkitTextFillColor: 'transparent', fontStyle: 'italic' }}>
              want to move fast.
            </span>
          </h1>
          <p className="pd-lead">Designing databases shouldn't slow you down.</p>
        </div>
      </div>

      {/* ── Why we built this ── */}
      <section className="pd-section">
        <div className="pd-inner--narrow">
          <div className="pd-label">// Origin</div>
          <h2 className="pd-h2">Why we built this</h2>

          <div className="pd-diff">
            <div className="pd-diff__tabs">
              <span className="pd-diff__tab pd-diff__tab--inactive">before.workflow</span>
              <span className="pd-diff__tab pd-diff__tab--active">after.workflow</span>
            </div>
            <div className="pd-diff__body">
              <div className="pd-diff-line pd-diff-line--removed"><span className="pd-diff-sign">−</span> Switch between SQL, ORM docs, and diagram tools</div>
              <div className="pd-diff-line pd-diff-line--removed"><span className="pd-diff-sign">−</span> Lose flow. Waste time. End up with a messy schema.</div>
              <div className="pd-diff-line pd-diff-line--removed" style={{ marginBottom: '16px' }}><span className="pd-diff-sign">−</span> Repeat for every single project</div>
              <div className="pd-diff-line pd-diff-line--added"><span className="pd-diff-sign">+</span> Design visually, write code, or generate with AI</div>
              <div className="pd-diff-line pd-diff-line--added"><span className="pd-diff-sign">+</span> All working together in real time</div>
              <div className="pd-diff-line pd-diff-line--added"><span className="pd-diff-sign">+</span> One source of truth for your schema</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Philosophy ── */}
      <section className="pd-section--alt">
        <div className="pd-inner">
          <div className="pd-label">// Philosophy</div>
          <h2 className="pd-h2">Our principles</h2>
          <div className="pd-grid-2">
            {[
              { icon: <Zap size={22} />, title: '1. Speed over complexity', desc: 'Tools should help you think faster — not slow you down with configuration and friction.' },
              { icon: <Code2 size={22} />, title: '2. Developers first', desc: 'Built for real workflows: Prisma, Drizzle, modern stacks. Not generic enterprise diagramming.' },
              { icon: <Database size={22} />, title: '3. One source of truth', desc: 'Your schema should live in one place — not scattered across code, diagrams, and docs.' },
              { icon: <Bot size={22} />, title: '4. AI as a tool, not a gimmick', desc: 'AI should actually build and improve your schema — not just autocomplete it.' },
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

      {/* ── What makes this different ── */}
      <section className="pd-section">
        <div className="pd-inner--narrow">
          <div className="pd-label">// Differentiator</div>
          <h2 className="pd-h2">What makes this different</h2>
          <p className="pd-body-text" style={{ marginBottom: '32px' }}>Most tools force you into one way of working. This platform adapts to how you think:</p>

          <div className="pd-code-block">
            {[
              { mode: 'visual', when: 'when you want clarity' },
              { mode: 'code',   when: 'when you want control' },
              { mode: 'AI',     when: 'when you want speed' },
            ].map(({ mode, when }) => (
              <div key={mode} style={{ marginBottom: '8px' }}>
                <span className="tok-keyword">use </span>
                <span className="tok-name">{mode} </span>
                <span className="tok-comment">// {when}</span>
              </div>
            ))}
            <div style={{ marginTop: '12px', color: 'var(--pd-accent)', fontWeight: 600 }}>// All perfectly in sync.</div>
          </div>

          <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'visual', desc: 'when you want clarity' },
              { label: 'code',   desc: 'when you want control' },
              { label: 'AI',     desc: 'when you want speed' },
            ].map(({ label, desc }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--pd-brand)', flexShrink: 0 }} />
                <span className="pd-body-text">
                  <strong style={{ color: 'var(--pd-text)' }}>{label}</strong> — {desc}
                </span>
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
          <h2 className="pd-cta-h2">Build faster. Ship sooner.</h2>
          <p className="pd-cta-sub">Your database shouldn't be the bottleneck.</p>
          <button className="pd-btn-primary" onClick={() => navigate('/login')}>Start building free →</button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

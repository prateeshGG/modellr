import { useNavigate } from 'react-router-dom';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import { HardDrive, Code2, Database, Bot } from 'lucide-react';
import '../styles/public-dark.css';

const REPO_URL = 'https://github.com/prateesh7777/schemaforge';

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
            A free schema designer{' '}
            <span style={{ WebkitTextStroke: '1.5px var(--pd-text)', WebkitTextFillColor: 'transparent', fontStyle: 'italic' }}>
              that stays on your machine.
            </span>
          </h1>
          <p className="pd-lead">Modellr is an open-source project, built and maintained on GitHub.</p>
        </div>
      </div>

      {/* ── Why this exists ── */}
      <section className="pd-section">
        <div className="pd-inner--narrow">
          <div className="pd-label">// Origin</div>
          <h2 className="pd-h2">Why this exists</h2>
          <p className="pd-body-text" style={{ marginBottom: '16px' }}>
            Sketching a database schema should not need an account, a subscription or an upload. Modellr started as a hosted
            service. It is now a free, open-source, local-first web app: you open it, design your tables, and export the
            result as SQL, Prisma, Drizzle, DBML, JSON, PNG or SVG.
          </p>
          <p className="pd-body-text">
            It is a static site. There is no backend, no sign-in and no database on our side. Your schemas are saved in your
            browser, and you can back them up as a JSON file.
          </p>
        </div>
      </section>

      {/* ── Principles ── */}
      <section className="pd-section--alt">
        <div className="pd-inner">
          <div className="pd-label">// Principles</div>
          <h2 className="pd-h2">How it is meant to work</h2>
          <div className="pd-grid-2">
            {[
              { icon: <HardDrive size={22} />, title: '1. Local-first', desc: 'Your schemas are stored in your browser and never uploaded. The trade-off is plain: clear your browser data and your projects are gone, so back them up.' },
              { icon: <Code2 size={22} />, title: '2. Open source', desc: 'MIT licensed. Read the code, fork it, or run your own copy. Self-hosting is just building the static files and serving them.' },
              { icon: <Database size={22} />, title: '3. Plain, portable output', desc: 'Export to SQL, Prisma, Drizzle, DBML or JSON so your design is never locked in. Review generated code and migrations before using them on a real database.' },
              { icon: <Bot size={22} />, title: '4. AI is optional and yours', desc: 'The AI assistant is off until you add your own key or point it at a local model. We host no AI, and its output can be wrong, so review it.' },
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

      {/* ── How it's built ── */}
      <section className="pd-section">
        <div className="pd-inner--narrow">
          <div className="pd-label">// Stack</div>
          <h2 className="pd-h2">How it's built</h2>
          <p className="pd-body-text" style={{ marginBottom: '32px' }}>
            Modellr is a single-page app written in TypeScript with React and Vite. The canvas uses React Flow and state is
            managed with Zustand. The repository is maintained by{' '}
            <a href="https://github.com/prateesh7777" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pd-brand)' }}>prateesh7777</a>.
          </p>

          <div className="pd-code-block">
            <div style={{ marginBottom: '8px' }}>
              <span className="tok-keyword">git clone </span>
              <span className="tok-name">{REPO_URL}</span>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span className="tok-keyword">npm </span>
              <span className="tok-name">install &amp;&amp; npm run build</span>
            </div>
            <div style={{ marginTop: '12px', color: 'var(--pd-accent)', fontWeight: 600 }}>// then serve the dist/ folder from any static host</div>
          </div>

          <p className="pd-body-text" style={{ marginTop: '32px' }}>
            Found a bug or have an idea? Open an issue on{' '}
            <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pd-brand)' }}>GitHub</a>.
            Contributions are welcome.
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="pd-cta pd-section--alt">
        <div className="pd-cta-glow-l" aria-hidden />
        <div className="pd-cta-glow-r" aria-hidden />
        <div className="pd-cta-inner">
          <h2 className="pd-cta-h2">Give it a try.</h2>
          <p className="pd-cta-sub">Free, open source, and no sign-up.</p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="pd-btn-primary" onClick={() => navigate('/app')}>Open the editor →</button>
            <a className="pd-btn-outline" href={REPO_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>View on GitHub</a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

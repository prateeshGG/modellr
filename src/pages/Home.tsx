import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Maximize2, Minimize2, Bot, Eye, Code2,
  Share2, Layers, RefreshCw, ExternalLink, History as HistoryIcon,
} from 'lucide-react';
import { Footer } from '../components/layout/Footer';
import { PublicNav } from '../components/layout/PublicNav';
import Editor from './Editor';
import './Home.css';

/* ─── Persona data ─────────────────────────────────────────── */
const PERSONAS = {
  indie: {
    label: 'Indie Hackers',
    title: 'Launch your SaaS without overthinking your database',
    tables: ['User', 'Subscription', 'Invoice', 'FeatureFlag'],
    color: '#00e5a0',
  },
  team: {
    label: 'Dev Teams',
    title: 'Ship without schema regrets',
    tables: ['User', 'Team', 'Permission', 'AuditLog'],
    color: '#ae7aff',
  },
  client: {
    label: 'Client Work',
    title: 'Communicate clearly with stakeholders',
    tables: ['Client', 'Project', 'Deliverable', 'Feedback'],
    color: '#f59e0b',
  },
} as const;

type PersonaKey = keyof typeof PERSONAS;

/* ─── Feature cards ────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <Bot size={20} />,
    comment: '// AI Schema Generation',
    code: `model Blog {\n  id     String @id\n  posts  Post[]  // ← auto-suggested\n  author User\n}`,
    badge: 'AI-Powered',
  },
  {
    icon: <RefreshCw size={20} />,
    comment: '// Real-Time Sync',
    code: `// Edit code → canvas updates live\n↔  Code  ↔  Visual  ↔  AI\n// Zero switching. Zero overhead.`,
    badge: 'Live Sync',
  },
  {
    icon: <ExternalLink size={20} />,
    comment: '// Modern Exports',
    code: `$ export --format=prisma\n✓ schema.prisma generated\n✓ Relations preserved`,
    badge: 'One Click',
  },
  {
    icon: <Layers size={20} />,
    comment: '// Auto Layout',
    code: `// 20 tables, 0 manual dragging\nelk.layout(graph)\n✓ Clean diagram — instantly`,
    badge: 'Smart Layout',
  },
  {
    icon: <Share2 size={20} />,
    comment: '// Collaboration',
    code: `// Real-time cursors + share links\nconst link = await share(schema)\n// Read-only or editable`,
    badge: 'Multiplayer',
  },
  {
    icon: <HistoryIcon size={20} />,
    comment: '// Version History',
    code: `// Experiment without fear\ngit diff schema@v3 schema@v4\n✓ Roll back anytime`,
    badge: 'Snapshots',
  },
];

/* ─── Component ────────────────────────────────────────────── */
export default function Home() {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePersona, setActivePersona] = useState<PersonaKey>('indie');
  const [cursorVisible, setCursorVisible] = useState(true);

  // Blinking cursor
  useEffect(() => {
    const id = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(id);
  }, []);

  const persona = PERSONAS[activePersona];

  return (
    <div className="home-root">
      <PublicNav dark />

      {/* ── 1. HERO ─────────────────────────────────────────── */}
      <header className="hero">
        {/* Dot-grid background */}
        <div className="hero-grid" aria-hidden />
        {/* Ambient glow blobs */}
        <div className="hero-glow hero-glow--brand" aria-hidden />
        <div className="hero-glow hero-glow--accent" aria-hidden />

        {/* Left column */}
        <div className="hero-left">
          <div className="hero-prompt">
            <span className="hero-prompt__dollar">$</span>
            <span className="hero-prompt__cmd">schema init</span>
            <span
              className="hero-cursor"
              style={{ opacity: cursorVisible ? 1 : 0 }}
              aria-hidden
            />
          </div>

          <h1 className="hero-h1">
            Generate schemas<br />
            <span className="hero-h1--outline">from a prompt.</span>
          </h1>

          <p className="hero-sub">
            AI-powered database design that exports directly to Prisma or Drizzle.
          </p>

          <div className="hero-actions">
            <button
              className="btn-primary"
              onClick={() => navigate('/login')}
            >
              Start building free
            </button>
            <button
              className="btn-ghost"
              onClick={() => document.getElementById('demo-anchor')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See how it works →
            </button>
          </div>

          <p className="hero-footnote">No signup required · Start instantly in your browser</p>
        </div>

        {/* Right column — live code preview */}
        <div className="hero-right" aria-hidden>
          <div className="code-window">
            <div className="code-window__bar">
              <span className="code-window__dot code-window__dot--red" />
              <span className="code-window__dot code-window__dot--yellow" />
              <span className="code-window__dot code-window__dot--green" />
              <span className="code-window__bar-label">schema.prisma</span>
            </div>
            <div className="code-window__body">
              <div className="code-line">
                <span className="tok-keyword">model</span>
                <span className="tok-name"> User </span>
                <span className="tok-brace">{'{'}</span>
              </div>
              <div className="code-line code-line--indent">
                <span className="tok-field">id</span>
                <span className="tok-type">     String  </span>
                <span className="tok-attr">@id @default(cuid())</span>
              </div>
              <div className="code-line code-line--indent">
                <span className="tok-field">email</span>
                <span className="tok-type">  String  </span>
                <span className="tok-attr">@unique</span>
              </div>
              <div className="code-line code-line--indent tok-comment">
                {'// ← auto-suggested by AI'}
              </div>
              <div className="code-line code-line--indent">
                <span className="tok-field">posts</span>
                <span className="tok-type">  Post[]</span>
              </div>
              <div className="code-line code-line--indent">
                <span className="tok-field">createdAt</span>
                <span className="tok-type"> DateTime </span>
                <span className="tok-attr">@default(now())</span>
              </div>
              <div className="code-line">
                <span className="tok-brace">{'}'}</span>
              </div>
              <div className="code-line" style={{ marginTop: '12px' }}>
                <span className="tok-keyword">model</span>
                <span className="tok-name"> Post </span>
                <span className="tok-brace">{'{'}</span>
              </div>
              <div className="code-line code-line--indent">
                <span className="tok-field">id</span>
                <span className="tok-type">       String  </span>
                <span className="tok-attr">@id @default(cuid())</span>
              </div>
              <div className="code-line code-line--indent">
                <span className="tok-field">author</span>
                <span className="tok-type">   User    </span>
                <span className="tok-attr">@relation(fields: [authorId])</span>
              </div>
              <div className="code-line code-line--indent">
                <span className="tok-field">authorId</span>
                <span className="tok-type"> String</span>
              </div>
              <div className="code-line">
                <span className="tok-brace">{'}'}</span>
              </div>
              <div className="code-line" style={{ marginTop: '8px' }}>
                <span
                  className="hero-cursor"
                  style={{ opacity: cursorVisible ? 1 : 0 }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── 2. DEMO SANDBOX ─────────────────────────────────── */}
      <section id="demo-anchor" className="demo-section">
        <div className="section-label">// Live Sandbox</div>
        <h2 className="section-h2">From idea → schema in seconds</h2>

        <div className="demo-prompt-pill">
          <Bot size={16} color="#ae7aff" />
          <code>"Build a SaaS schema with users, billing, and analytics"</code>
        </div>

        <div
          className="demo-frame"
          style={isFullscreen ? {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            height: '100vh', width: '100vw', zIndex: 9999,
            borderRadius: 0, maxWidth: 'none',
          } : {}}
        >
          <div className="demo-frame__bar">
            <div className="demo-frame__dots">
              <span className="code-window__dot code-window__dot--red" />
              <span className="code-window__dot code-window__dot--yellow" />
              <span className="code-window__dot code-window__dot--green" />
              <span className="demo-frame__bar-label">Live Sandbox — Try editing!</span>
            </div>
            <button
              className="demo-frame__fullscreen"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
          <div className="demo-frame__body">
            <Editor isSandbox />
          </div>
        </div>

        <p className="demo-caption">
          <span className="demo-caption__arrow">→</span>
          15 tables generated instantly. Fully linked. Ready to export.
        </p>
      </section>

      {/* ── 3. PROBLEM / SOLUTION (git diff) ────────────────── */}
      <section className="diff-section">
        <div className="diff-inner">
          <div className="section-label">// The Problem</div>

          <div className="diff-window">
            <div className="diff-window__tabs">
              <span className="diff-tab diff-tab--inactive">before.dbml</span>
              <span className="diff-tab diff-tab--active">after.dbml</span>
            </div>
            <div className="diff-window__body">
              <div className="diff-line diff-line--removed">
                <span className="diff-sign">−</span>
                Jump between SQL editor, ORM docs, and diagram tools
              </div>
              <div className="diff-line diff-line--removed">
                <span className="diff-sign">−</span>
                Manually draw every relation line
              </div>
              <div className="diff-line diff-line--removed">
                <span className="diff-sign">−</span>
                Export SQL then manually translate to Prisma
              </div>
              <div className="diff-line diff-line--removed" style={{ marginBottom: '20px' }}>
                <span className="diff-sign">−</span>
                Repeat for every single project
              </div>
              <div className="diff-line diff-line--added">
                <span className="diff-sign">+</span>
                Describe your app in plain English
              </div>
              <div className="diff-line diff-line--added">
                <span className="diff-sign">+</span>
                Full schema with indexes and relations — instant
              </div>
              <div className="diff-line diff-line--added">
                <span className="diff-sign">+</span>
                One-click Prisma or Drizzle export
              </div>
              <div className="diff-line diff-line--added">
                <span className="diff-sign">+</span>
                Version controlled from the start
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. FEATURE CARDS (code snippets) ────────────────── */}
      <section className="features-section">
        <div className="features-inner">
          <div className="section-label">// What you get</div>
          <h2 className="section-h2">Built for how developers actually work</h2>

          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-card__header">
                  <span className="feature-card__icon">{f.icon}</span>
                  <span className="feature-card__comment">{f.comment}</span>
                </div>
                <pre className="feature-card__code">{f.code}</pre>
                <span className="feature-card__badge">{f.badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. THREE MODES ──────────────────────────────────── */}
      <section className="modes-section">
        <div className="modes-inner">
          <div className="section-label">// One tool. Three ways to build.</div>
          <h2 className="section-h2">
            The only tool where AI, code, and visual design are fully synchronized.
          </h2>

          <div className="modes-grid">
            {[
              { icon: <Eye size={24} />, title: 'Visual', desc: 'Design with a clean, auto-layout canvas. Drag, connect, and organize without touching code.' },
              { icon: <Code2 size={24} />, title: 'Code', desc: 'Write DBML or SQL with instant visual preview. Your canvas updates as you type.' },
              { icon: <Bot size={24} />, title: 'AI', desc: 'Describe your system in plain English — get a full schema with relations and indexes instantly.' },
            ].map((m, i) => (
              <div key={i} className="mode-card">
                <div className="mode-card__icon">{m.icon}</div>
                <h3 className="mode-card__title">{m.title}</h3>
                <p className="mode-card__desc">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. PERSONA SELECTOR ─────────────────────────────── */}
      <section className="persona-section">
        <div className="persona-inner">
          <div className="section-label">// Built for real workflows</div>

          <div className="persona-tabs">
            {(Object.keys(PERSONAS) as PersonaKey[]).map(key => (
              <button
                key={key}
                className={`persona-tab${activePersona === key ? ' persona-tab--active' : ''}`}
                style={activePersona === key ? { borderColor: PERSONAS[key].color, color: PERSONAS[key].color } : {}}
                onClick={() => setActivePersona(key)}
              >
                {PERSONAS[key].label}
              </button>
            ))}
          </div>

          <div className="persona-content">
            <h3 className="persona-title">{persona.title}</h3>
            <div
              className="persona-schema"
              style={{ borderLeftColor: persona.color }}
            >
              <div className="persona-schema__header">
                <span className="tok-keyword">model</span>
                <span className="tok-name"> {persona.tables[0]} </span>
                <span className="tok-brace">{'{'}</span>
              </div>
              {persona.tables.map((t, i) => (
                <div key={t} className="persona-schema__row">
                  {i === 0
                    ? <><span className="tok-field">id</span><span className="tok-type">     String @id</span></>
                    : <><span className="tok-field">{t.toLowerCase()}</span><span className="tok-type">  {t}[]</span></>
                  }
                </div>
              ))}
              <div className="persona-schema__header">
                <span className="tok-brace">{'}'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. PRICING ──────────────────────────────────────── */}
      <section className="pricing-section">
        <div className="pricing-inner">
          <div className="section-label">// Simple, honest pricing</div>
          <h2 className="section-h2">If this saves you even 2 hours, it pays for itself.</h2>

          <div className="pricing-grid">
            {/* Free */}
            <div className="pricing-card">
              <div className="pricing-card__tier">Free</div>
              <div className="pricing-card__price">$0<span>/mo</span></div>
              <div className="pricing-card__tagline">Start building instantly.</div>
              <ul className="pricing-card__features">
                <li><span className="check">✓</span> Unlimited editing</li>
                <li><span className="check">✓</span> 3 saved schemas</li>
                <li><span className="check">✓</span> SQL / DBML export</li>
                <li><span className="check">✓</span> Limited AI usage</li>
              </ul>
              <button className="btn-outline" onClick={() => navigate('/login')}>
                Start free
              </button>
            </div>

            {/* Pro */}
            <div className="pricing-card pricing-card--pro">
              <div className="pricing-card__badge">MOST POPULAR</div>
              <div className="pricing-card__tier">Pro</div>
              <div className="pricing-card__price">$15<span>/mo</span></div>
              <div className="pricing-card__tagline" style={{ color: '#ae7aff' }}>
                Everything you need to ship faster.
              </div>
              <ul className="pricing-card__features">
                <li><span className="check">✓</span> Unlimited schemas</li>
                <li><span className="check">✓</span> Prisma &amp; Drizzle export</li>
                <li><span className="check">✓</span> Full AI capabilities</li>
                <li><span className="check">✓</span> Version history</li>
                <li><span className="check">✓</span> Real-time collaboration</li>
              </ul>
              <button className="btn-primary" onClick={() => navigate('/pricing')}>
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. FINAL CTA ────────────────────────────────────── */}
      <section className="cta-section">
        <div className="cta-glow cta-glow--left" aria-hidden />
        <div className="cta-glow cta-glow--right" aria-hidden />
        <div className="cta-inner">
          <h2 className="cta-h2">
            Design your database<br />in minutes.
          </h2>
          <button className="btn-cta" onClick={() => navigate('/login')}>
            Start building free →
          </button>
          <p className="cta-footnote">No credit card · Cancel anytime · Free forever</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

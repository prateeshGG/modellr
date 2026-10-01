import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Maximize2, Minimize2, Bot, Eye, Code2,
  Share2, Layers, Upload, Download, History as HistoryIcon,
  HardDrive, GitBranch,
} from 'lucide-react';
import { Footer } from '../components/layout/Footer';
import { PublicNav } from '../components/layout/PublicNav';
import Editor from './Editor';
import './Home.css';

const REPO_URL = 'https://github.com/prateesh7777/schemaforge';

/* ─── Feature cards ────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <Layers size={20} />,
    comment: '// Visual canvas',
    code: `// tables, fields, relationships\norders.user_id → users.id\n// drag to link, auto-layout to tidy`,
    badge: 'Canvas',
  },
  {
    icon: <Upload size={20} />,
    comment: '// Import',
    code: `$ import schema.sql\n$ import schema.prisma\n$ import backup.json`,
    badge: 'SQL · Prisma · JSON',
  },
  {
    icon: <Download size={20} />,
    comment: '// Export',
    code: `$ export --format=drizzle\n// SQL (Postgres, MySQL, SQLite,\n// SQL Server), Prisma, Drizzle,\n// DBML, JSON, PNG, SVG`,
    badge: '7 formats',
  },
  {
    icon: <HistoryIcon size={20} />,
    comment: '// Snapshots & diff',
    code: `// save a snapshot, keep editing\ndiff current ↔ snapshot\n// generates migration SQL to review`,
    badge: 'Local history',
  },
  {
    icon: <Share2 size={20} />,
    comment: '// Share links',
    code: `// schema is compressed into the URL\n/app/shared#/schema/…\n// recipients get a read-only snapshot`,
    badge: 'No server',
  },
  {
    icon: <Bot size={20} />,
    comment: '// Optional AI',
    code: `// bring your own key\nbaseUrl = "http://localhost:11434/v1"\n// OpenAI, OpenRouter, or Ollama`,
    badge: 'Your key',
  },
];

/* ─── Component ────────────────────────────────────────────── */
export default function Home() {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Blinking cursor
  useEffect(() => {
    const id = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(id);
  }, []);

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
            Design database schemas<br />
            <span className="hero-h1--outline">in your browser.</span>
          </h1>

          <p className="hero-sub">
            A free, open-source database schema designer. No sign-up. Your schemas stay in your browser.
          </p>

          <div className="hero-actions">
            <button
              className="btn-primary"
              onClick={() => navigate('/app')}
            >
              Open the editor
            </button>
            <button
              className="btn-ghost"
              onClick={() => window.open(REPO_URL, '_blank', 'noopener,noreferrer')}
            >
              View on GitHub →
            </button>
          </div>

          <p className="hero-footnote">MIT licensed · No accounts · Nothing is uploaded</p>
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
                {'// ← relation to Post'}
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
        <h2 className="section-h2">Try the editor right here</h2>

        <div className="demo-prompt-pill">
          <Eye size={16} color="#ae7aff" />
          <code>Starts from the E-commerce template. Edits here are not saved.</code>
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
              <span className="demo-frame__bar-label">Live Sandbox — try editing</span>
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
          The sandbox is the same editor you get at /app, minus saving.
        </p>
      </section>

      {/* ── 3. PROBLEM / SOLUTION (git diff) ────────────────── */}
      <section className="diff-section">
        <div className="diff-inner">
          <div className="section-label">// Why local-first</div>

          <div className="diff-window">
            <div className="diff-window__tabs">
              <span className="diff-tab diff-tab--inactive">usual-setup.txt</span>
              <span className="diff-tab diff-tab--active">modellr.txt</span>
            </div>
            <div className="diff-window__body">
              <div className="diff-line diff-line--removed">
                <span className="diff-sign">−</span>
                Create an account before drawing a table
              </div>
              <div className="diff-line diff-line--removed">
                <span className="diff-sign">−</span>
                Upload your schema to someone else's server
              </div>
              <div className="diff-line diff-line--removed" style={{ marginBottom: '20px' }}>
                <span className="diff-sign">−</span>
                Re-type the same design for every target format
              </div>
              <div className="diff-line diff-line--added">
                <span className="diff-sign">+</span>
                Open the editor and start
              </div>
              <div className="diff-line diff-line--added">
                <span className="diff-sign">+</span>
                Schemas saved in your browser (IndexedDB)
              </div>
              <div className="diff-line diff-line--added">
                <span className="diff-sign">+</span>
                Export SQL, Prisma, Drizzle, DBML, JSON, PNG or SVG
              </div>
              <div className="diff-line diff-line--added">
                <span className="diff-sign">+</span>
                MIT licensed. Read the source.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. FEATURE CARDS (code snippets) ────────────────── */}
      <section className="features-section">
        <div className="features-inner">
          <div className="section-label">// What you get</div>
          <h2 className="section-h2">What's in the editor</h2>

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
          <div className="section-label">// How it works</div>
          <h2 className="section-h2">
            A static web app. Your browser does the work.
          </h2>

          <div className="modes-grid">
            {[
              { icon: <Eye size={24} />, title: 'Canvas, split or code view', desc: 'Design on a visual canvas, or open split mode to watch the generated SQL, DBML, Prisma or Drizzle update beside it. The code panel is read-only.' },
              { icon: <HardDrive size={24} />, title: 'Saved in your browser', desc: 'Projects live in IndexedDB on your device. Back up and restore everything as a JSON file. Clearing browser data deletes your projects, so keep a backup.' },
              { icon: <Code2 size={24} />, title: 'Open source, MIT', desc: 'Built with React, TypeScript, Vite, React Flow and Zustand. To self-host, build the static files and serve them from any static host.' },
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

      {/* ── 6. FINAL CTA ────────────────────────────────────── */}
      <section className="cta-section">
        <div className="cta-glow cta-glow--left" aria-hidden />
        <div className="cta-glow cta-glow--right" aria-hidden />
        <div className="cta-inner">
          <h2 className="cta-h2">
            Design your database<br />in your browser.
          </h2>
          <button className="btn-cta" onClick={() => navigate('/app')}>
            Open the editor →
          </button>
          <p className="cta-footnote">
            Free and open source ·{' '}
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
              <GitBranch size={12} style={{ verticalAlign: '-1px' }} /> GitHub
            </a>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

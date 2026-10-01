import { useNavigate } from 'react-router-dom';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import { Bot, Layers, ExternalLink, Upload, Link2, History, HardDrive, Command } from 'lucide-react';
import '../styles/public-dark.css';

const FEATURES = [
  {
    icon: <Layers size={24} />,
    title: 'Visual schema editor',
    comment: '// canvas',
    body: 'Build tables on a canvas. Fields support types, primary and foreign keys, unique, nullable, defaults, check constraints and comments. Drag between fields to create relationships, and add notes and groups to organise the diagram. Auto-layout, search, undo/redo and light or dark theme are built in.',
  },
  {
    icon: <Command size={24} />,
    title: 'Command palette & split view',
    comment: '// Ctrl/Cmd+K',
    body: 'Press Ctrl/Cmd+K to search commands: add a table, auto-layout, import, compare, share, switch theme. Switch between canvas, split and code views. Split view shows generated SQL, DBML, Prisma or Drizzle next to the canvas; the code panel is read-only, so you edit on the canvas.',
  },
  {
    icon: <Upload size={24} />,
    title: 'Import',
    comment: '// import schema.sql',
    body: 'Paste SQL DDL (CREATE TABLE and friends) or a Prisma schema. PostgreSQL and MySQL are the primary SQL dialects; SQLite and SQL Server syntax is only partly supported, so check the result. You can also import a Modellr JSON file for a single schema or a full backup.',
  },
  {
    icon: <ExternalLink size={24} />,
    title: 'Export',
    comment: '// export --format=prisma',
    body: 'Export SQL for PostgreSQL, MySQL, SQLite or SQL Server, plus Prisma, Drizzle ORM, DBML and JSON. Save the canvas as PNG or SVG for docs and wikis. Always review exported code before using it in a real project.',
  },
  {
    icon: <History size={24} />,
    title: 'Snapshots & diff',
    comment: '// compare with snapshot',
    body: 'Save local snapshots of a project as you go, restore an earlier one, or compare the current schema with a snapshot. The diff viewer generates migration SQL for the changes. Review it before you run it: a renamed column or table appears as a drop plus an add.',
  },
  {
    icon: <Link2 size={24} />,
    title: 'Share links & embeds',
    comment: '// stateless share',
    body: 'A share link compresses the schema into the URL itself, so there is no server involved. Whoever opens it sees a read-only snapshot, and an iframe embed works the same way. Very large schemas produce very long links; export JSON instead.',
  },
  {
    icon: <HardDrive size={24} />,
    title: 'Local-first storage',
    comment: '// IndexedDB',
    body: 'There are no accounts. Projects are saved in your browser only and nothing is uploaded. Back up and restore all schemas as one JSON file, or export a single schema. Clearing your browser data deletes your projects, so keep backups of anything important.',
  },
  {
    icon: <Bot size={24} />,
    title: 'Optional AI (bring your own key)',
    comment: '// your key, your provider',
    body: 'If you want AI help, add an OpenAI-compatible endpoint in Settings: OpenAI, OpenRouter, or a local model such as Ollama. Requests go from your browser straight to that provider and the key is stored only in your browser. There is no AI hosted by us. AI output can be wrong, so review it.',
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
          <h1 className="pd-h1">What Modellr{' '}
            <span style={{ WebkitTextStroke: '1.5px var(--pd-text)', WebkitTextFillColor: 'transparent', fontStyle: 'italic' }}>
              does.
            </span>
          </h1>
          <p className="pd-lead">
            A free, open-source, local-first database schema designer. It runs entirely in your browser, with no account.
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
          <h2 className="pd-cta-h2">Try it in your browser.</h2>
          <p className="pd-cta-sub">Free and open source under the MIT license. No sign-up.</p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="pd-btn-primary" onClick={() => navigate('/app')}>Open the editor →</button>
            <a className="pd-btn-outline" href="https://github.com/prateesh7777/modellr" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>View on GitHub</a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

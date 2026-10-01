import { Link } from 'react-router-dom';
import { SiteShell, PageHead } from '../components/site/SiteShell';
import { ArtStack } from '../components/site/Art';
import { GitHubMark } from '../components/layout/GitHubMark';
import { REPO_URL } from '../config';
import { useUIStore } from '../store/ui';
import editorDark from '../assets/editor-dark.webp';
import editorLight from '../assets/editor-light.webp';

const FORMATS = ['PostgreSQL', 'MySQL', 'SQLite', 'SQL Server', 'Prisma', 'Drizzle', 'DBML', 'JSON', 'PNG', 'SVG'];

export function Features() {
  const theme = useUIStore((s) => s.theme);
  return (
    <SiteShell route="/features">
      <PageHead
        eyebrow="Features"
        title="Everything a schema designer needs. Nothing it doesn't."
        lead="A free, open-source, local-first designer. It runs entirely in your browser, with no account."
      />
      <section className="n-section n-section--tight" style={{ paddingTop: 24 }}>
        <div className="n-wrap">
          <div className="n-bento" style={{ marginTop: 0 }}>
            <article className="n-card span-4">
              <div className="n-card__art" style={{ aspectRatio: '16 / 8', display: 'block', position: 'relative' }}>
                <img src={theme === 'light' ? editorLight : editorDark} alt="The canvas with four linked tables" width={1800} height={1018} loading="lazy" style={{ position: 'absolute', width: '150%', maxWidth: 'none', left: '-28%', top: '-18%' }} />
              </div>
              <h2 className="n-h4">Visual canvas</h2>
              <p className="n-small">Tables with typed fields, primary and foreign keys, unique, nullable, defaults, checks and comments. Drag between fields to create relationships; add notes and groups; auto-layout, search, undo/redo and a command palette (Ctrl/Cmd+K). Split and code views show generated SQL, DBML, Prisma or Drizzle next to the canvas.</p>
            </article>
            <article className="n-card span-2">
              <div className="n-panel" style={{ marginBottom: 6 }}>
                <pre className="n-code" style={{ fontSize: '.72rem', padding: '14px 16px', lineHeight: 1.7 }}>{'CREATE TABLE posts (\n  id serial PRIMARY KEY,\n  author_id uuid\n    REFERENCES users(id)\n);'}</pre>
              </div>
              <h2 className="n-h4">Import</h2>
              <p className="n-small">Paste SQL DDL (pg_dump and mysqldump files work) or a Prisma schema, or import a Modellr JSON file. PostgreSQL and MySQL are the primary dialects; check the result for SQLite and SQL Server. Unsupported statements are reported, not fatal.</p>
            </article>
            <article className="n-card span-2">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 96, alignContent: 'flex-start' }}>
                {FORMATS.map((f) => <span key={f} className="n-badge" style={{ height: 26, padding: '0 10px', fontSize: '.75rem' }}>{f}</span>)}
              </div>
              <h2 className="n-h4">Export</h2>
              <p className="n-small">SQL for four dialects, Prisma, Drizzle ORM, DBML and JSON; PNG and SVG for docs. Covered by round-trip tests. Always review exported code before using it on a real database.</p>
            </article>
            <article className="n-card span-2">
              <div className="n-panel" style={{ marginBottom: 6 }}>
                <pre className="n-code" style={{ fontSize: '.78rem', padding: '14px 16px', lineHeight: 1.8 }}>
                  <span className="c">-- WARNING: destructive</span>{'\n'}
                  <span style={{ color: '#ff8080' }}>- DROP COLUMN legacy_id</span>{'\n'}
                  <span style={{ color: '#8fd7a8' }}>+ ADD COLUMN tags jsonb</span>
                </pre>
              </div>
              <h2 className="n-h4">Snapshots and diff</h2>
              <p className="n-small">Save versions, restore one, or diff against the current schema and generate migration SQL. A renamed column shows up as a drop plus an add, so review before you run it.</p>
            </article>
            <article className="n-card span-2">
              <div className="n-panel" style={{ marginBottom: 6 }}>
                <div className="n-panel__head"><span>/app/shared#N4Ig3gzg…</span><span className="n-badge n-badge--ok">read-only</span></div>
                <div style={{ padding: '14px 16px', fontFamily: 'var(--n-mono)', fontSize: '.75rem', color: '#8b929b' }}>schema in the URL · 0 bytes uploaded</div>
              </div>
              <h2 className="n-h4">Share links and embeds</h2>
              <p className="n-small">The schema is compressed into the URL, so there is no server. Recipients see a read-only snapshot and can save a copy; an iframe embed works the same way. Very large schemas make very long links: export JSON instead.</p>
            </article>
            <article className="n-card span-3">
              <div className="n-card__art" style={{ aspectRatio: '16 / 6' }}><ArtStack /></div>
              <h2 className="n-h4">Local-first storage</h2>
              <p className="n-small">No accounts. Projects live in your browser (IndexedDB) and nothing is uploaded. Back everything up as one JSON file and restore it anywhere. Clearing site data deletes your projects, so keep backups.</p>
            </article>
            <article className="n-card span-3">
              <div className="n-card__art" style={{ aspectRatio: '16 / 6', padding: 18 }}>
                <div style={{ display: 'grid', gap: 8, width: '100%', fontFamily: 'var(--n-mono)', fontSize: '.75rem', color: 'var(--n-text-2)' }}>
                  <span>→ OpenAI</span><span>→ OpenRouter</span><span>→ Ollama · localhost:11434</span><span className="n-dim">your key stays in this browser</span>
                </div>
              </div>
              <h2 className="n-h4">AI assistant, bring your own key</h2>
              <p className="n-small">Optional. Add an OpenAI-compatible endpoint in Settings. The request goes from your browser straight to the provider you choose; we host no AI. Proposals are reviewed before they touch your schema, and AI output can be wrong.</p>
            </article>
          </div>
        </div>
      </section>
      <section className="n-section n-cta">
        <div className="n-wrap n-center">
          <h2 className="n-h1">Try it in your browser.</h2>
          <div className="n-cta__actions">
            <Link to="/app" className="n-btn n-btn--lg">Open the editor</Link>
            <a className="n-btn n-btn--secondary n-btn--lg" href={REPO_URL} target="_blank" rel="noopener noreferrer"><GitHubMark size={16} /> Star on GitHub</a>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

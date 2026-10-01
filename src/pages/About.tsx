import { Link } from 'react-router-dom';
import { SiteShell, PageHead } from '../components/site/SiteShell';
import { GitHubMark } from '../components/layout/GitHubMark';
import { REPO_URL } from '../config';

const PRINCIPLES = [
  ['Local-first', 'Your schemas are stored in your browser and never uploaded. The trade-off is plain: clear your browser data and your projects are gone, so back them up.'],
  ['Open source', 'MIT licensed. Read the code, fork it, or run your own copy. Self-hosting is just building the static files and serving them.'],
  ['Plain, portable output', 'Export to SQL, Prisma, Drizzle, DBML or JSON so your design is never locked in. Review generated code and migrations before using them on a real database.'],
  ['AI is optional and yours', 'The AI assistant is off until you add your own key or point it at a local model. We host no AI, and its output can be wrong, so review it.'],
] as const;

export function About() {
  return (
    <SiteShell route="/about">
      <PageHead eyebrow="About" title="A free schema designer that stays on your machine." lead="Modellr is an open-source project, built and maintained on GitHub." />
      <section className="n-section n-section--tight" style={{ paddingTop: 24 }}>
        <div className="n-wrap n-grid-2" style={{ gap: 48, alignItems: 'start' }}>
          <div className="n-prose">
            <h2 style={{ marginTop: 0 }}>Why this exists</h2>
            <p>Sketching a database schema should not need an account, a subscription or an upload. Modellr started as a hosted service. It is now a free, open-source, local-first web app: you open it, design your tables, and export the result as SQL, Prisma, Drizzle, DBML, JSON, PNG or SVG.</p>
            <p>It is a static site. There is no backend, no sign-in and no database on our side. Your schemas are saved in your browser, and you can back them up as a JSON file.</p>
            <h2>How it is built</h2>
            <p>Modellr is a single-page app written in TypeScript with React and Vite. The canvas uses React Flow and state is managed with Zustand. The repository is maintained by <a href="https://github.com/prateesh7777" target="_blank" rel="noopener noreferrer">prateesh7777</a>.</p>
            <div className="n-panel">
              <div className="n-panel__head"><span>terminal</span></div>
              <pre className="n-code" tabIndex={0}>{`git clone ${REPO_URL}\nnpm install && npm run build\n# then serve the dist/ folder from any static host`}</pre>
            </div>
            <p>Found a bug or have an idea? Open an issue on <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer">GitHub</a>. Contributions are welcome.</p>
          </div>
          <div className="n-stack">
            <span className="n-eyebrow">Principles</span>
            {PRINCIPLES.map(([t, d], i) => (
              <div key={t} className="n-card"><span className="n-card__meta">{String(i + 1).padStart(2, '0')}</span><h3 className="n-h4">{t}</h3><p className="n-small">{d}</p></div>
            ))}
          </div>
        </div>
      </section>
      <section className="n-section n-cta">
        <div className="n-wrap n-center">
          <h2 className="n-h1">Give it a try.</h2>
          <p className="n-lead">Free, open source, and no sign-up.</p>
          <div className="n-cta__actions">
            <Link to="/app" className="n-btn n-btn--lg">Open the editor</Link>
            <a className="n-btn n-btn--secondary n-btn--lg" href={REPO_URL} target="_blank" rel="noopener noreferrer"><GitHubMark size={16} /> Star on GitHub</a>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SiteShell, PageHead } from '../components/site/SiteShell';
import { MiniSchema } from '../components/site/MiniSchema';
import { TEMPLATES } from '../utils/templates';
import { TEMPLATE_CATEGORIES, templateInCategory } from '../utils/constants';

export function PublicTemplates() {
  const [active, setActive] = useState<string>('all');
  const list = Object.entries(TEMPLATES).map(([id, tpl]) => ({ id, ...tpl }));
  const shown = list.filter((t) => templateInCategory(t.id, active));

  return (
    <SiteShell
      title="Database schema templates"
      path="/templates"
      description="Free starter database schemas: e-commerce, multi-tenant SaaS, blog and auth. Open one in the browser editor, change it, and export SQL, Prisma or Drizzle."
    >
      <PageHead eyebrow="Templates" title="Start from a real schema." lead="Starter schemas you can open in the editor and adapt. Free, and nothing to sign up for." />
      <section className="n-section n-section--tight" style={{ paddingTop: 8 }}>
        <div className="n-wrap">
          <div className="n-toolbar" role="group" aria-label="Filter by category">
            {TEMPLATE_CATEGORIES.map((c) => (
              <button key={c.id} type="button" className="n-chip" aria-pressed={active === c.id} onClick={() => setActive(c.id)}>{c.label}</button>
            ))}
          </div>
          {shown.length === 0 ? (
            <div className="n-empty">
              <h2 className="n-h3">No templates in that category yet.</h2>
              <p className="n-small">Try another filter, or start from a blank schema and import your own SQL.</p>
              <button type="button" className="n-btn" onClick={() => setActive('all')}>Show all templates</button>
            </div>
          ) : (
            <div className="n-grid-2">
              {shown.map((t) => (
                <Link key={t.id} to="/app/templates" className="n-card">
                  <div className="n-card__art"><MiniSchema tables={t.tables} /></div>
                  <span className="n-card__meta">{t.tables.length} tables · {t.tables.reduce((n, x) => n + x.fields.length, 0)} fields</span>
                  <h2 className="n-h3">{t.label}</h2>
                  <p className="n-small">{t.description}</p>
                  <span className="n-arrow">Open templates</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
